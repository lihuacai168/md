import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import Buffer from 'buffer-from'

import COS from 'cos-js-sdk-v5'
import CryptoJS from 'crypto-js'
import * as qiniu from 'qiniu-js'
import OSS from 'tiny-oss'
import { v4 as uuidv4 } from 'uuid'
import { giteeConfig, githubConfig } from '@/config'
import fetch from '@/utils/fetch'
import * as tokenTools from '@/utils/tokenTools'
import { base64encode, safe64, utf16to8 } from '@/utils/tokenTools'

function getConfig(useDefault: boolean, platform: string) {
  if (useDefault) {
    // load default config file
    const config = platform === `github` ? githubConfig : giteeConfig
    const { username, repoList, branch, accessTokenList } = config

    // choose random token from access_token list
    const tokenIndex = Math.floor(Math.random() * accessTokenList.length)
    const accessToken = accessTokenList[tokenIndex].replace(`doocsmd`, ``)

    // choose random repo from repo list
    const repoIndex = Math.floor(Math.random() * repoList.length)
    const repo = repoList[repoIndex]

    return { username, repo, branch, accessToken }
  }

  // load configuration from localStorage
  const customConfig = JSON.parse(localStorage.getItem(`${platform}Config`)!)

  // split username/repo
  const repoUrl = customConfig.repo
    .replace(`https://${platform}.com/`, ``)
    .replace(`http://${platform}.com/`, ``)
    .replace(`${platform}.com/`, ``)
    .split(`/`)
  return {
    username: repoUrl[0],
    repo: repoUrl[1],
    branch: customConfig.branch || `main`,
    accessToken: customConfig.accessToken,
  }
}

/**
 * 获取 `年/月/日` 形式的目录
 * @returns string
 */
function getDir() {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, `0`)
  const day = date.getDate().toString().padStart(2, `0`)
  return `${year}/${month}/${day}`
}

/**
 * 根据文件名获取它以 `时间戳+uuid` 的形式
 * @param {string} filename 文件名
 * @returns {string} `时间戳+uuid`
 */
function getDateFilename(filename: string) {
  const currentTimestamp = new Date().getTime()
  // 获取最后一个点号后的内容作为文件扩展名
  const fileSuffix = filename.split(`.`).pop()
  return `${currentTimestamp}-${uuidv4()}.${fileSuffix}`
}

// -----------------------------------------------------------------------
// GitHub File Upload
// -----------------------------------------------------------------------

async function ghFileUpload(content: string, filename: string) {
  const useDefault = localStorage.getItem(`imgHost`) === `default`
  const config = getConfig(useDefault, `github`)
  const { username, repo, accessToken } = config
  let { branch } = config

  const dir = getDir()
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${dir}/`
  const dateFilename = getDateFilename(filename)

  // Try upload with configured branch first
  let res
  try {
    res = await fetch<{ content: {
      download_url: string
    } }, {
        content: {
          download_url: string
        }
        data?: {
          content: {
            download_url: string
          }
        }
      }>({
      url: url + dateFilename,
      method: `put`,
      headers: {
        Authorization: `token ${accessToken}`,
      },
      data: {
        content,
        branch,
        message: `Upload by ${window.location.href}`,
      },
    })
  }
  catch (error: any) {
    // If branch not found, try with alternative branch
    if (error?.status === 404 && error?.message?.includes(`Branch`)) {
      const altBranch = branch === `master` ? `main` : `master`
      console.log(`Branch ${branch} not found, trying ${altBranch}`)

      res = await fetch<{ content: {
        download_url: string
      } }, {
          content: {
            download_url: string
          }
          data?: {
            content: {
              download_url: string
            }
          }
        }>({
        url: url + dateFilename,
        method: `put`,
        headers: {
          Authorization: `token ${accessToken}`,
        },
        data: {
          content,
          branch: altBranch,
          message: `Upload by ${window.location.href}`,
        },
      })

      // Update branch in config for next time
      branch = altBranch
      if (!useDefault) {
        const customConfig = JSON.parse(localStorage.getItem(`githubConfig`)!)
        customConfig.branch = altBranch
        localStorage.setItem(`githubConfig`, JSON.stringify(customConfig))
      }
    }
    else {
      throw error
    }
  }

  const githubResourceUrl = `raw.githubusercontent.com/${username}/${repo}/${branch}/`
  const cdnResourceUrl = `fastly.jsdelivr.net/gh/${username}/${repo}@${branch}/`
  res.content = res.data?.content || res.content
  return useDefault
    ? res.content.download_url.replace(githubResourceUrl, cdnResourceUrl)
    : res.content.download_url
}

// -----------------------------------------------------------------------
// Gitee File Upload
// -----------------------------------------------------------------------

async function giteeUpload(content: any, filename: string) {
  const useDefault = localStorage.getItem(`imgHost`) === `default`
  const { username, repo, branch, accessToken } = getConfig(useDefault, `gitee`)
  const dir = getDir()
  const dateFilename = getDateFilename(filename)
  const url = `https://gitee.com/api/v5/repos/${username}/${repo}/contents/${dir}/${dateFilename}`
  const res = await fetch<{ content: {
    download_url: string
  } }, {
      content: {
        download_url: string
      }
      data: {
        content: {
          download_url: string
        }
      }
    }>({
    url,
    method: `POST`,
    data: {
      content,
      branch,
      access_token: accessToken,
      message: `Upload by ${window.location.href}`,
    },
  })
  res.content = res.data?.content || res.content
  return encodeURI(res.content.download_url)
}

// -----------------------------------------------------------------------
// Qiniu File Upload
// -----------------------------------------------------------------------

function getQiniuToken(accessKey: string, secretKey: string, putPolicy: {
  scope: string
  deadline: number
}) {
  const policy = JSON.stringify(putPolicy)
  const encoded = base64encode(utf16to8(policy))
  const hash = CryptoJS.HmacSHA1(encoded, secretKey)
  const encodedSigned = hash.toString(CryptoJS.enc.Base64)
  return `${accessKey}:${safe64(encodedSigned)}:${encoded}`
}

async function qiniuUpload(file: File) {
  const { accessKey, secretKey, bucket, region, path, domain } = JSON.parse(
    localStorage.getItem(`qiniuConfig`)!,
  )
  const token = getQiniuToken(accessKey, secretKey, {
    scope: bucket,
    deadline: Math.trunc(new Date().getTime() / 1000) + 3600,
  })
  const dir = path ? `${path}/` : ``
  const dateFilename = dir + getDateFilename(file.name)
  const observable = qiniu.upload(file, dateFilename, token, {}, { region })
  return new Promise<string>((resolve, reject) => {
    observable.subscribe({
      next: (result) => {
        console.log(result)
      },
      error: (err) => {
        reject(err.message)
      },
      complete: (result) => {
        resolve(`${domain}/${result.key}`)
      },
    })
  })
}

// -----------------------------------------------------------------------
// AliOSS File Upload
// -----------------------------------------------------------------------

async function aliOSSFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const { region, bucket, accessKeyId, accessKeySecret, useSSL, cdnHost, path }
    = JSON.parse(localStorage.getItem(`aliOSSConfig`)!)
  const dir = path ? `${path}/${dateFilename}` : dateFilename
  const secure = useSSL === undefined || useSSL
  const protocol = secure ? `https` : `http`
  const client = new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    secure,
  })

  try {
    await client.put(dir, file)
    return cdnHost ? `${cdnHost}/${dir}` : `${protocol}://${bucket}.${region}.aliyuncs.com/${dir}`
  }
  catch (e) {
    return Promise.reject(e)
  }
}

// -----------------------------------------------------------------------
// TxCOS File Upload
// -----------------------------------------------------------------------

async function txCOSFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const { secretId, secretKey, bucket, region, path, cdnHost } = JSON.parse(
    localStorage.getItem(`txCOSConfig`)!,
  )
  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey,
  })
  return new Promise<string>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: `${path}/${dateFilename}`,
        Body: file,
      },
      (err, data) => {
        if (err) {
          reject(err)
        }
        else if (cdnHost) {
          resolve(
            path === ``
              ? `${cdnHost}/${dateFilename}`
              : `${cdnHost}/${path}/${dateFilename}`,
          )
        }
        else {
          resolve(`https://${data.Location}`)
        }
      },
    )
  })
}

// -----------------------------------------------------------------------
// Minio File Upload
// -----------------------------------------------------------------------

async function minioFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const { endpoint, port, useSSL, bucket, accessKey, secretKey } = JSON.parse(
    localStorage.getItem(`minioConfig`)!,
  )
  const s3Client = new S3Client({
    endpoint: `${useSSL ? `https` : `http`}://${endpoint}${port ? `:${port}` : ``}`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    region: `auto`,
    forcePathStyle: true,
  })

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: dateFilename,
    ContentType: file.type,
  })
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
  const response = await window.fetch(presignedUrl, {
    method: `PUT`,
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`MinIO upload failed: ${response.status} ${response.statusText}`)
  }
  return `${useSSL ? `https` : `http`}://${endpoint}${port ? `:${port}` : ``}/${bucket}/${dateFilename}`
}

// -----------------------------------------------------------------------
// mp File Upload
// -----------------------------------------------------------------------
interface MpResponse {
  access_token: string
  expires_in: number
  errcode: number
  errmsg: string
}
async function getMpToken(appID: string, appsecret: string, proxyOrigin: string) {
  const data = localStorage.getItem(`mpToken:${appID}`)
  if (data) {
    const token = JSON.parse(data)
    if (token.expire && token.expire > new Date().getTime()) {
      return token.access_token
    }
  }
  const requestOptions = {
    method: `POST`,
    data: {
      grant_type: `client_credential`,
      appid: appID,
      secret: appsecret,
    },
  }
  let url = `https://api.weixin.qq.com/cgi-bin/stable_token`
  if (proxyOrigin) {
    url = `${proxyOrigin}/cgi-bin/stable_token`
  }
  const res = await fetch<any, MpResponse>(url, requestOptions)
  if (res.access_token) {
    const tokenInfo = {
      ...res,
      expire: new Date().getTime() + res.expires_in * 1000,
    }
    localStorage.setItem(`mpToken:${appID}`, JSON.stringify(tokenInfo))
    return res.access_token
  }
  return ``
}
// Cloudflare Pages 环境
const isCfPage = import.meta.env.CF_PAGES === `1`
async function mpFileUpload(file: File) {
  let { appID, appsecret, proxyOrigin } = JSON.parse(
    localStorage.getItem(`mpConfig`)!,
  )
  // 未填写代理域名且是cfpages环境
  if (!proxyOrigin && isCfPage) {
    proxyOrigin = window.location.origin
  }
  const access_token = await getMpToken(appID, appsecret, proxyOrigin)
  if (!access_token) {
    throw new Error(`获取 access_token 失败`)
  }

  const formdata = new FormData()
  formdata.append(`media`, file, file.name)

  const requestOptions = {
    method: `POST`,
    data: formdata,
  }

  let url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${access_token}&type=image`
  const fileSizeInMB = file.size / (1024 * 1024)
  const fileType = file.type.toLowerCase()
  if (fileSizeInMB < 1 && (fileType === `image/jpeg` || fileType === `image/png`)) {
    url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${access_token}`
  }
  if (proxyOrigin) {
    url = url.replace(`https://api.weixin.qq.com`, proxyOrigin)
  }

  const res = await fetch<any, { url: string }>(url, requestOptions)

  if (!res.url) {
    throw new Error(`上传失败，未获取到URL`)
  }

  let imageUrl = res.url
  if (proxyOrigin && window.location.href.startsWith(`http`)) {
    imageUrl = `https://wsrv.nl?url=${encodeURIComponent(imageUrl)}`
  }

  return imageUrl
}

// -----------------------------------------------------------------------
// Cloudflare R2 File Upload
// -----------------------------------------------------------------------

async function r2Upload(file: File) {
  const { accountId, accessKey, secretKey, bucket, path, domain } = JSON.parse(
    localStorage.getItem(`r2Config`)!,
  )
  const dir = path ? `${path}/` : ``
  // 使用传入的文件名，如果是默认格式则重新生成
  const filename = file.name.includes(`image-`) && file.name.match(/\d{13}-/)
    ? dir + getDateFilename(file.name)
    : dir + file.name
  const client = new S3Client({ region: `auto`, endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } })
  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: filename, ContentType: file.type }),
    { expiresIn: 300 },
  )
  const response = await window.fetch(signedUrl, {
    method: `PUT`,
    body: file,
  })

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`)
  }
  return `${domain}/${filename}`
}

// -----------------------------------------------------------------------
// Upyun File Upload
// -----------------------------------------------------------------------

async function upyunUpload(file: File) {
  const { bucket, operator, password, path, domain } = JSON.parse(
    localStorage.getItem(`upyunConfig`)!,
  )
  const filename = `${path}/${getDateFilename(file.name)}`
  const uri = `/${bucket}/${filename}`
  const arrayBuffer = await file.arrayBuffer()
  const date = new Date().toUTCString()
  const method = `PUT`
  const signStr = [method, uri, date].join(`&`)
  const passwordMd5 = CryptoJS.MD5(password).toString()
  const signature = CryptoJS.HmacSHA1(signStr, passwordMd5).toString(CryptoJS.enc.Base64)
  const authorization = `UPYUN ${operator}:${signature}`
  const url = `https://v0.api.upyun.com${uri}`
  const res = await window.fetch(url, {
    method: `PUT`,
    headers: {
      'Authorization': authorization,
      'X-Date': date,
      'Content-Type': file.type,
    },
    body: arrayBuffer,
  })

  if (!res.ok) {
    throw new Error(`上传失败: ${await res.text()}`)
  }

  return `${domain}/${filename}`
}

// -----------------------------------------------------------------------
// Telegram File Upload
// -----------------------------------------------------------------------
async function telegramUpload(file: File): Promise<string> {
  const { token, chatId } = JSON.parse(localStorage.getItem(`telegramConfig`)!)

  // 1. sendPhoto
  const form = new FormData()
  form.append(`chat_id`, chatId)
  form.append(`photo`, file, file.name)

  const sendRes = await fetch<any, {
    ok: boolean
    result: {
      photo: { file_id: string }[]
    }
  }>({
    url: `https://api.telegram.org/bot${token}/sendPhoto`,
    method: `POST`,
    data: form,
  })

  if (!sendRes.ok || !sendRes.result.photo.length) {
    throw new Error(`Telegram sendPhoto 失败`)
  }
  // 取最大的分辨率那张图
  const fileId = sendRes.result.photo[sendRes.result.photo.length - 1].file_id

  // 2. getFile
  const fileRes = await fetch<any, {
    ok: boolean
    result: { file_path: string }
  }>({
    url: `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
    method: `GET`,
  })
  if (!fileRes.ok) {
    throw new Error(`Telegram getFile 失败`)
  }

  const filePath = fileRes.result.file_path
  // 3. 拼出下载地址
  return `https://api.telegram.org/file/bot${token}/${filePath}`
}

// -----------------------------------------------------------------------
// Cloudinary File Upload
// -----------------------------------------------------------------------

/**
 * localStorage 中 cloudinaryConfig 的示例：
 * {
 *   "cloudName": "demo",
 *   "apiKey": "1234567890",
 *   "apiSecret": "abcdefg1234567890",     // 可选：若未填写则走 unsigned preset
 *   "uploadPreset": "unsigned_preset",     // 可选：有 apiSecret 时可省略
 *   "folder": "blog/image",                // 可选：Cloudinary 目录，留空则根路径
 *   "domain": "https://cdn.example.com"    // 可选：自定义访问域名 / CDN 域名
 * }
 */
async function cloudinaryUpload(file: File): Promise<string> {
  const {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    folder = ``,
    domain,
  } = JSON.parse(localStorage.getItem(`cloudinaryConfig`)!)

  if (!cloudName || !apiKey)
    throw new Error(`Cloudinary 配置缺少 cloudName / apiKey`)

  const timestamp = Math.floor(Date.now() / 1000) // Cloudinary 要求秒级时间戳
  const formData = new FormData()
  formData.append(`file`, file)
  formData.append(`api_key`, apiKey)
  formData.append(`timestamp`, `${timestamp}`)

  // ---------- 1) 需要签名的场景 ----------
  if (apiSecret) {
    // 参与签名的字段需按字典序排列并拼接成 a=b&c=d… 的格式
    const params: string[] = []
    if (folder)
      params.push(`folder=${folder}`)
    if (uploadPreset)
      params.push(`upload_preset=${uploadPreset}`)
    params.push(`timestamp=${timestamp}`)

    const signatureBase = params.sort().join(`&`)
    const signature = CryptoJS.SHA1(signatureBase + apiSecret).toString()
    formData.append(`signature`, signature)
  }
  // ---------- 2) unsigned preset ----------
  else if (uploadPreset) {
    formData.append(`upload_preset`, uploadPreset)
  }
  else {
    throw new Error(`未配置 apiSecret 时必须提供 uploadPreset`)
  }

  if (folder)
    formData.append(`folder`, folder)

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const res = await fetch<any, { secure_url?: string, url?: string }>(uploadUrl, {
    method: `POST`,
    data: formData,
  })

  const originUrl = res.secure_url || res.url
  if (!originUrl)
    throw new Error(`Cloudinary 返回缺少 url 字段`)

  // 如果配置了自定义域名，则把 host 换掉
  if (domain) {
    const { pathname, search } = new URL(originUrl)
    return `${domain}${pathname}${search}`
  }

  return originUrl
}

// -----------------------------------------------------------------------
// formCustom File Upload
// -----------------------------------------------------------------------

async function formCustomUpload(content: string, file: File) {
  const str = `
    async (CUSTOM_ARG) => {
      ${localStorage.getItem(`formCustomConfig`)}
    }
  `
  return new Promise<string>((resolve, reject) => {
    const exportObj = {
      content, // 待上传图片的 base64
      file, // 待上传图片的 file 对象
      util: {
        axios: fetch, // axios 实例
        CryptoJS, // 加密库
        OSS, // tiny-oss
        COS, // cos-js-sdk-v5
        Buffer, // buffer-from
        uuidv4, // uuid
        qiniu, // qiniu-js
        tokenTools, // 一些编码转换函数
        getDir, // 获取 年/月/日 形式的目录
        getDateFilename, // 根据文件名获取它以 时间戳+uuid 的形式
      },
      okCb: resolve, // 重要: 上传成功后给此回调传 url 即可
      errCb: reject, // 上传失败调用的函数
    }
    // eslint-disable-next-line no-eval
    eval(str)(exportObj).catch((err: any) => {
      console.error(err)
      reject(err)
    })
  })
}

export function fileUpload(content: string, file: File) {
  const imgHost = localStorage.getItem(`imgHost`)
  if (!imgHost) {
    localStorage.setItem(`imgHost`, `default`)
  }
  switch (imgHost) {
    case `aliOSS`:
      return aliOSSFileUpload(file)
    case `minio`:
      return minioFileUpload(file)
    case `txCOS`:
      return txCOSFileUpload(file)
    case `qiniu`:
      return qiniuUpload(file)
    case `gitee`:
      return giteeUpload(content, file.name)
    case `github`:
      return ghFileUpload(content, file.name)
    case `mp`:
      return mpFileUpload(file)
    case `r2`:
      return r2Upload(file)
    case `upyun`:
      return upyunUpload(file)
    case `telegram`:
      return telegramUpload(file)
    case `cloudinary`:
      return cloudinaryUpload(file)
    case `formCustom`:
      return formCustomUpload(content, file)
    default:
      // 默认使用R2上传
      return r2Upload(file)
  }
}
