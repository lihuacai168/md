<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { UploadCloud } from 'lucide-vue-next'
import { Field, Form } from 'vee-validate'
import * as yup from 'yup'
import { useDisplayStore } from '@/stores'
import { checkImage } from '@/utils'

const emit = defineEmits([`uploadImage`])

const displayStore = useDisplayStore()

// github
const githubSchema = toTypedSchema(yup.object({
  repo: yup.string().required(`GitHub 仓库不能为空`),
  branch: yup.string().optional(),
  accessToken: yup.string().required(`GitHub Token 不能为空`),
}))

const githubConfig = ref(localStorage.getItem(`githubConfig`)
  ? JSON.parse(localStorage.getItem(`githubConfig`)!)
  : { repo: ``, branch: ``, accessToken: `` })

function githubSubmit(formValues: any) {
  localStorage.setItem(`githubConfig`, JSON.stringify(formValues))
  githubConfig.value = formValues
  toast.success(`保存成功`)
}

// 阿里云
const aliOSSSchema = toTypedSchema(yup.object({
  accessKeyId: yup.string().required(`AccessKey ID 不能为空`),
  accessKeySecret: yup.string().required(`AccessKey Secret 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  useSSL: yup.boolean().required(),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const aliOSSConfig = ref(localStorage.getItem(`aliOSSConfig`)
  ? JSON.parse(localStorage.getItem(`aliOSSConfig`)!)
  : {
      accessKeyId: ``,
      accessKeySecret: ``,
      bucket: ``,
      region: ``,
      useSSL: true,
      cdnHost: ``,
      path: ``,
    })

function aliOSSSubmit(formValues: any) {
  localStorage.setItem(`aliOSSConfig`, JSON.stringify(formValues))
  aliOSSConfig.value = formValues
  toast.success(`保存成功`)
}

// 腾讯云
const txCOSSchema = toTypedSchema(yup.object({
  secretId: yup.string().required(`Secret ID 不能为空`),
  secretKey: yup.string().required(`Secret Key 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  region: yup.string().required(`Region 不能为空`),
  cdnHost: yup.string().optional(),
  path: yup.string().optional(),
}))

const txCOSConfig = ref(localStorage.getItem(`txCOSConfig`)
  ? JSON.parse(localStorage.getItem(`txCOSConfig`)!)
  : {
      secretId: ``,
      secretKey: ``,
      bucket: ``,
      region: ``,
      cdnHost: ``,
      path: ``,
    })

function txCOSSubmit(formValues: any) {
  localStorage.setItem(`txCOSConfig`, JSON.stringify(formValues))
  txCOSConfig.value = formValues
  toast.success(`保存成功`)
}

// 七牛云
const qiniuSchema = toTypedSchema(yup.object({
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  region: yup.string().optional(),
  path: yup.string().optional(),
}))

const qiniuConfig = ref(localStorage.getItem(`qiniuConfig`)
  ? JSON.parse(localStorage.getItem(`qiniuConfig`)!)
  : {
      accessKey: ``,
      secretKey: ``,
      bucket: ``,
      domain: ``,
      region: ``,
      path: ``,
    })

function qiniuSubmit(formValues: any) {
  localStorage.setItem(`qiniuConfig`, JSON.stringify(formValues))
  qiniuConfig.value = formValues
  toast.success(`保存成功`)
}

// MinIO
const minioOSSSchema = toTypedSchema(yup.object({
  endpoint: yup.string().required(`Endpoint 不能为空`),
  port: yup.string().optional(),
  useSSL: yup.boolean().required(),
  bucket: yup.string().required(`Bucket 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
}))

const minioOSSConfig = ref(localStorage.getItem(`minioConfig`)
  ? JSON.parse(localStorage.getItem(`minioConfig`)!)
  : {
      endpoint: ``,
      port: ``,
      useSSL: true,
      bucket: ``,
      accessKey: ``,
      secretKey: ``,
    })

function minioOSSSubmit(formValues: any) {
  localStorage.setItem(`minioConfig`, JSON.stringify(formValues))
  minioOSSConfig.value = formValues
  toast.success(`保存成功`)
}

// Telegram 图床
const telegramSchema = toTypedSchema(
  yup.object({
    token: yup.string().required(`Bot Token 不能为空`),
    chatId: yup.string().required(`Chat ID 不能为空`),
  }),
)
const telegramConfig = ref(
  localStorage.getItem(`telegramConfig`)
    ? JSON.parse(localStorage.getItem(`telegramConfig`)!)
    : { token: ``, chatId: `` },
)
function telegramSubmit(values: any) {
  localStorage.setItem(`telegramConfig`, JSON.stringify(values))
  telegramConfig.value = values
  toast.success(`保存成功`)
}

// 公众号
// 当前是否为网页（http/https 协议）
const isWebsite = window.location.protocol.startsWith(`http`)

// Cloudflare Pages 环境
const isCfPage = import.meta.env.CF_PAGES === `1`

// 插件模式运行（如 chrome-extension://）
const isPluginMode = !isWebsite

// 是否需要填写 proxyOrigin（只在 非插件 且 非CF页面 时需要）
const isProxyRequired = computed(() => {
  return !isPluginMode && !isCfPage
})

const mpPlaceholder = computed(() => {
  if (isProxyRequired.value) {
    return `如：http://proxy.example.com`
  }
  return `可不填`
})
const mpSchema = computed(() =>
  toTypedSchema(yup.object({
    proxyOrigin: isProxyRequired.value
      ? yup.string().required(`代理域名不能为空`)
      : yup.string().optional(),
    appID: yup.string().required(`AppID 不能为空`),
    appsecret: yup.string().required(`AppSecret 不能为空`),
  })),
)

const mpConfig = ref(localStorage.getItem(`mpConfig`)
  ? JSON.parse(localStorage.getItem(`mpConfig`)!)
  : {
      proxyOrigin: ``,
      appID: ``,
      appsecret: ``,
    })

function mpSubmit(formValues: any) {
  localStorage.setItem(`mpConfig`, JSON.stringify(formValues))
  mpConfig.value = formValues
  toast.success(`保存成功`)
}

// Cloudflare R2
const r2Schema = toTypedSchema(yup.object({
  accountId: yup.string().required(`Account ID 不能为空`),
  accessKey: yup.string().required(`AccessKey 不能为空`),
  secretKey: yup.string().required(`SecretKey 不能为空`),
  bucket: yup.string().required(`Bucket 不能为空`),
  domain: yup.string().required(`Bucket 对应域名不能为空`),
  path: yup.string().optional(),
}))

const r2Config = ref(localStorage.getItem(`r2Config`)
  ? JSON.parse(localStorage.getItem(`r2Config`)!)
  : {
      accountId: ``,
      accessKey: ``,
      secretKey: ``,
      bucket: ``,
      domain: ``,
      path: ``,
    })

function r2Submit(formValues: any) {
  localStorage.setItem(`r2Config`, JSON.stringify(formValues))
  r2Config.value = formValues
  toast.success(`保存成功`)
}

// 又拍云
const upyunSchema = computed(() => toTypedSchema(
  yup.object({
    bucket: yup.string().required(`Bucket 不能为空`),
    operator: yup.string().required(`操作员 不能为空`),
    password: yup.string().required(`密码 不能为空`),
    domain: yup.string().required(`CDN 域名不能为空`),
    path: yup.string().optional(),
  }),
))

const upyunConfig = ref(localStorage.getItem(`upyunConfig`)
  ? JSON.parse(localStorage.getItem(`upyunConfig`)!)
  : {
      bucket: ``,
      operator: ``,
      password: ``,
      domain: ``,
      path: ``,
    })

function upyunSubmit(formValues: any) {
  localStorage.setItem(`upyunConfig`, JSON.stringify(formValues))
  upyunConfig.value = formValues
  toast.success(`保存成功`)
}

// Cloudinary
const cloudinarySchema = toTypedSchema(
  yup.object({
    cloudName: yup.string().required(`Cloud Name 不能为空`),
    apiKey: yup.string().required(`API Key 不能为空`),
    apiSecret: yup.string().optional(),
    uploadPreset: yup.string().when(`apiSecret`, {
      is: (v: string | undefined) => !v || v.length === 0,
      then: s => s.required(`未填写 apiSecret 时必须提供上传预设名`),
      otherwise: s => s.optional(),
    }),
    folder: yup.string().optional(),
    domain: yup.string().optional(),
  }),
)

const cloudinaryConfig = ref(
  localStorage.getItem(`cloudinaryConfig`)
    ? JSON.parse(localStorage.getItem(`cloudinaryConfig`)!)
    : {
        cloudName: ``,
        apiKey: ``,
        apiSecret: ``,
        uploadPreset: ``,
        folder: ``,
        domain: ``,
      },
)

function cloudinarySubmit(formValues: any) {
  localStorage.setItem(`cloudinaryConfig`, JSON.stringify(formValues))
  cloudinaryConfig.value = formValues
  toast.success(`保存成功`)
}

const options = [
  {
    value: `default`,
    label: `默认`,
  },
  {
    value: `github`,
    label: `GitHub`,
  },
  {
    value: `aliOSS`,
    label: `阿里云`,
  },
  {
    value: `txCOS`,
    label: `腾讯云`,
  },
  {
    value: `qiniu`,
    label: `七牛云`,
  },
  {
    value: `minio`,
    label: `MinIO`,
  },
  {
    value: `mp`,
    label: `公众号图床`,
  },
  {
    value: `r2`,
    label: `Cloudflare R2`,
  },
  {
    value: `upyun`,
    label: `又拍云`,
  },
  { value: `telegram`, label: `Telegram` },
  {
    value: `cloudinary`,
    label: `Cloudinary`,
  },

  {
    value: `formCustom`,
    label: `自定义代码`,
  },
]

const imgHost = ref(`r2`)

const activeName = ref(`upload`)

onBeforeMount(() => {
  const savedHost = localStorage.getItem(`imgHost`)
  if (savedHost) {
    imgHost.value = savedHost
  }
  else {
    // 首次使用，设置默认值并保存
    localStorage.setItem(`imgHost`, `r2`)
  }
})

function changeImgHost() {
  localStorage.setItem(`imgHost`, imgHost.value)
  toast.success(`图床已切换`)
}

function beforeImageUpload(file: File) {
  // check image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }
  // check image host
  let imgHost = localStorage.getItem(`imgHost`)
  imgHost = imgHost || `default`
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = imgHost === `default` || config
  if (!isValidHost) {
    toast.error(`请先配置 ${imgHost} 图床参数`)
    return false
  }
  return true
}

const dragover = ref(false)

const { open, reset, onChange } = useFileDialog({
  accept: `image/*`,
})

onChange((files) => {
  if (files == null) {
    return
  }

  const file = files[0]

  beforeImageUpload(file) && emit(`uploadImage`, file)
  reset()
})

function onDrop(e: DragEvent) {
  dragover.value = false
  e.stopPropagation()
  const file = Array.from(e.dataTransfer!.files)[0]
  beforeImageUpload(file) && emit(`uploadImage`, file)
}
</script>

<template>
  <Dialog v-model:open="displayStore.isShowUploadImgDialog">
    <DialogContent class="max-w-max" @pointer-down-outside="ev => ev.preventDefault()">
      <DialogHeader>
        <DialogTitle>本地上传</DialogTitle>
      </DialogHeader>
      <Tabs v-model="activeName" class="w-max">
        <TabsList>
          <TabsTrigger value="upload">
            选择上传
          </TabsTrigger>
          <TabsTrigger v-for="item in options.filter(item => item.value !== 'default')" :key="item.value" :value="item.value">
            {{ item.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Label>
            <span class="my-4 block">
              图床
            </span>
            <Select v-model="imgHost" @update:model-value="changeImgHost">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in options"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <div
            class="bg-clip-padding mt-4 h-50 flex flex-col cursor-pointer items-center justify-evenly border-2 rounded border-dashed transition-colors hover:border-gray-700 hover:bg-gray-400/50 dark:hover:border-gray-200 dark:hover:bg-gray-500/50"
            :class="{
              'border-gray-700 bg-gray-400/50 dark:border-gray-200 dark:bg-gray-500/50': dragover,
            }"
            @click="open()"
            @drop.prevent="onDrop"
            @dragover.prevent="dragover = true"
            @dragleave.prevent="dragover = false"
          >
            <UploadCloud class="size-20" />
            <p>
              将图片拖到此处，或
              <strong>点击上传</strong>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="github">
          <Form :validation-schema="githubSchema" :initial-values="githubConfig" @submit="githubSubmit">
            <Field v-slot="{ field, errorMessage }" name="repo">
              <FormItem label="GitHub 仓库" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：github.com/yanglbme/resource"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="branch">
              <FormItem label="分支" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：release，可不填，默认 master"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessToken">
              <FormItem label="Token" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：cc1d0c1426d0fd0902bd2d7184b14da61b8abc46"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
                target="_blank"
              >
                如何获取 GitHub Token？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="aliOSS">
          <Form :validation-schema="aliOSSSchema" :initial-values="aliOSSConfig" @submit="aliOSSSubmit">
            <Field v-slot="{ field, errorMessage }" name="accessKeyId">
              <FormItem label="AccessKey ID" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：LTAI4GdoocsmdoxUf13ylbaNHk"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKeySecret">
              <FormItem label="AccessKey Secret" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：cc1d0c142doocs0902bd2d7md4b14da6ylbabc46"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="Bucket 所在区域" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：oss-cn-shenzhen"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
              <FormItem label="UseSSL" required :error="errorMessage">
                <Switch
                  :checked="field.value"
                  :name="field.name"
                  @update:checked="field.onChange"
                  @blur="field.onBlur"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="cdnHost">
              <FormItem label="自定义 CDN 域名" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://imagecdn.alidaodao.com，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认为根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://help.aliyun.com/document_detail/31883.html"
                target="_blank"
              >
                如何使用阿里云 OSS？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="txCOS">
          <Form :validation-schema="txCOSSchema" :initial-values="txCOSConfig" @submit="txCOSSubmit">
            <Field v-slot="{ field, errorMessage }" name="secretId">
              <FormItem label="SecretId" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：AKIDnQp1w3DOOCSs8F5MDp9tdoocsmdUPonW3"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：ukLmdtEJ9271f3DOocsMDsCXdS3YlbW0"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs-3212520134"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="Bucket 所在区域" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：ap-guangzhou"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="cdnHost">
              <FormItem label="自定义 CDN 域名" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://imagecdn.alidaodao.com，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://cloud.tencent.com/document/product/436/38484"
                target="_blank"
              >
                如何使用腾讯云 COS？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="qiniu">
          <Form :validation-schema="qiniuSchema" :initial-values="qiniuConfig" @submit="qiniuSubmit">
            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：6DD3VaLJ_SQgOdoocsyTV_YWaDmdnL2n8EGx7kG"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="如：qgZa5qrvDOOcsmdKStD1oCjZ9nB7MDvJUs_34SIm"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：md"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="Bucket 对应域名" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://images.123ylb.cn"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="region">
              <FormItem label="存储区域" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：z2，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：img，可不填，默认为根目录"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://developer.qiniu.com/kodo"
                target="_blank"
              >
                如何使用七牛云 Kodo？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="minio">
          <Form :validation-schema="minioOSSSchema" :initial-values="minioOSSConfig" @submit="minioOSSSubmit">
            <Field v-slot="{ field, errorMessage }" name="endpoint">
              <FormItem label="Endpoint" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：play.min.io"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="port">
              <FormItem label="Port" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="number"
                  placeholder="如：9000，可不填，http 默认为 80，https 默认为 443"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="useSSL" type="boolean">
              <FormItem label="UseSSL" required :error="errorMessage">
                <Switch
                  :checked="field.value"
                  :name="field.name"
                  @update:checked="field.onChange"
                  @blur="field.onBlur"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：doocs"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：zhangsan" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：asdasdasd" />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="http://docs.minio.org.cn/docs/master/minio-client-complete-guide"
                target="_blank"
              >
                如何使用 MinIO？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="mp">
          <Form :validation-schema="mpSchema" :initial-values="mpConfig" @submit="mpSubmit">
            <!-- 只有在需要代理时才显示 proxyOrigin 字段 -->
            <Field
              v-if="isProxyRequired"
              v-slot="{ field, errorMessage }"
              name="proxyOrigin"
            >
              <FormItem label="代理域名" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  :placeholder="mpPlaceholder"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="appID">
              <FormItem label="appID" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：wx6e1234567890efa3"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="appsecret">
              <FormItem label="appsecret" required :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：d9f1abcdef01234567890abcdef82397"
                />
              </FormItem>
            </Field>

            <FormItem>
              <div class="flex flex-col items-start">
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Getting_Started_Guide.html"
                  target="_blank"
                >
                  如何开启公众号开发者模式并获取应用账号密钥？
                </Button>
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://md-pages.doocs.org/tutorial/"
                  target="_blank"
                >
                  如何在浏览器插件中使用公众号图床？
                </Button>
              </div>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="r2">
          <Form :validation-schema="r2Schema" :initial-values="r2Config" @submit="r2Submit">
            <Field v-slot="{ field, errorMessage }" name="accountId">
              <FormItem label="AccountId" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: 0030f123e55a57546f4c281c564e560" class="min-w-[350px]" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="accessKey">
              <FormItem label="AccessKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: 358090b3a12824a6b0787gae7ad0fc72" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="secretKey">
              <FormItem label="SecretKey" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：md" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="域名" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：https://oss.example.com" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
              </FormItem>
            </Field>

            <FormItem>
              <div class="flex flex-col items-start">
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.cloudflare.com/r2/api/s3/api/"
                  target="_blank"
                >
                  如何使用 S3 API 操作 Cloudflare R2？
                </Button>
                <Button
                  variant="link"
                  class="p-0"
                  as="a"
                  href="https://developers.cloudflare.com/r2/buckets/cors/"
                  target="_blank"
                >
                  如何设置跨域(CORS)？
                </Button>
              </div>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="upyun">
          <Form :validation-schema="upyunSchema" :initial-values="upyunConfig" @submit="upyunSubmit">
            <Field v-slot="{ field, errorMessage }" name="bucket">
              <FormItem label="Bucket" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: md" class="min-w-[350px]" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="operator">
              <FormItem label="操作员" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如: operator" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="password">
              <FormItem label="操作员密码" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" type="password" placeholder="如: c1c4dbcb0b6b785ac6633422a06dff3dac055fe74fe40xj1b5c5fcf1bf128010" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="域名" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：http://xxx.test.upcdn.net" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="path">
              <FormItem label="存储路径" :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：img，可不填，默认为根目录" />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://help.upyun.com/"
                target="_blank"
              >
                如何使用 又拍云？
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="telegram">
          <Form :validation-schema="telegramSchema" :initial-values="telegramConfig" @submit="telegramSubmit">
            <Field v-slot="{ field, errorMessage }" name="token">
              <FormItem label="Bot Token" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：123456789:ABCdefGHIjkl-MNOPqrSTUvwxYZ" />
              </FormItem>
            </Field>
            <Field v-slot="{ field, errorMessage }" name="chatId">
              <FormItem label="Chat ID" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：-1001234567890" />
              </FormItem>
            </Field>
            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://github.com/doocs/md/blob/main/docs/telegram-usage.md"
                target="_blank"
              >
                如何使用 Telegram？
              </Button>
            </FormItem>
            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="cloudinary">
          <Form
            :validation-schema="cloudinarySchema"
            :initial-values="cloudinaryConfig"
            @submit="cloudinarySubmit"
          >
            <Field v-slot="{ field, errorMessage }" name="cloudName">
              <FormItem label="Cloud Name" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：demo" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="apiKey">
              <FormItem label="API Key" required :error="errorMessage">
                <Input v-bind="field" v-model="field.value" placeholder="如：1234567890" />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="apiSecret">
              <FormItem label="API Secret" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  type="password"
                  placeholder="用于签名上传，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="uploadPreset">
              <FormItem label="Upload Preset" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="unsigned 时必填，signed 时可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="folder">
              <FormItem label="Folder" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：blog/image，可不填"
                />
              </FormItem>
            </Field>

            <Field v-slot="{ field, errorMessage }" name="domain">
              <FormItem label="自定义域名 / CDN" :error="errorMessage">
                <Input
                  v-bind="field"
                  v-model="field.value"
                  placeholder="如：https://cdn.example.com，可不填"
                />
              </FormItem>
            </Field>

            <FormItem>
              <Button
                variant="link"
                class="p-0"
                as="a"
                href="https://cloudinary.com/documentation/upload_images"
                target="_blank"
              >
                Cloudinary 使用文档
              </Button>
            </FormItem>

            <FormItem>
              <Button type="submit">
                保存配置
              </Button>
            </FormItem>
          </Form>
        </TabsContent>

        <TabsContent value="formCustom">
          <CustomUploadForm />
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
