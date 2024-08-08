<script setup>
  import { onActivated, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import LoginByQRCode from './LoginByQRCode.vue';
  import LoginByAccount from './LoginByAccount.vue';

  const route = useRoute()
  const router = useRouter()
  //通过网易云还是本地
  const accountMode = ref(route.query.mode)

  ///通过二维码还是账号
  const loginMode = ref(route.query.mode)

  //当为账号登陆时当前选择的是邮箱还是手机 1:邮箱 2:手机
  const currentMode = ref(0)

  const loginByQR = ref(null)
  const loginByAC = ref(null)
  const jumpPage = ref(false)

  onActivated(() => {
    currentMode.value = 0
    accountMode.value = route.query.mode
    loginMode.value = route.query.mode
    if(accountMode.value == 0) {
        loginByQR.value.checkQR()
    }
  })

  if(accountMode.value == 0) loginMode.value = 0
  else loginMode.value = 1

  const changeMode =(mode) => {
    if(mode != 2) {
        loginMode.value = 1
        currentMode.value = mode
        loginByAC.value.inputFocus()
    } else {
        loginByQR.value.checkQR()
        loginMode.value = 0
    }
    if(accountMode.value == 0 && loginMode.value == 1) {
        loginByQR.value.clearTimer()
    }
  }
  const register = () => {
    if(accountMode.value == 0) windowApi.toRegister("https://music.163.com/")
    else console.log('注册本地帐号')
  }
  //登录成功跳转页面并销毁当前页面
  const jumpTo = () => {
      jumpPage.value = true
      const jumpDelay = setTimeout(() => {
        router.push('/mymusic')
        jumpPage.value = false
        clearTimeout(jumpDelay)
      }, 3000);
  }

</script>

<template>
  <div class="login-content" :class="{'jumpPage': jumpPage}">
    <div class="login-container">
        <div class="login-header">
            <div class="login-icon">
                <img src="../assets/img/netease-music.png" alt="">
            </div>
            <span class="login-title">登录网易云账号</span>
        </div>
        
        <LoginByQRCode class="qrcode-container" ref="loginByQR" @jumpTo="jumpTo" :firstLoadMode="loginMode" v-show="loginMode == 0 && accountMode == 0"></LoginByQRCode>
        <LoginByAccount class="account-container" ref="loginByAC" @jumpTo="jumpTo" :currentMode="currentMode"  v-show="loginMode == 1"></LoginByAccount>

        <div class="login-other">
            <span class="qrcode-tip" v-show="loginMode == 0 && accountMode == 0">打开网易云APP扫码登录</span>
            <div class="login-method" v-show="loginMode == 0 && accountMode == 0">
                <span class="login-mail" @click="changeMode(0)">邮箱登录</span>
                <span class="separation">|</span>
                <span class="login-phone" @click="changeMode(1)">手机登录</span>
            </div>
            <div class="login-method" v-show="loginMode == 1">
                <span class="login-mail" @click="changeMode(0)" v-show="!currentMode == 0">邮箱登录</span>
                <span class="login-phone" @click="changeMode(1)" v-show="!currentMode == 1">手机登录</span>
                <span class="separation" v-show="accountMode == 0">|</span>
                <span class="login-qr" @click="changeMode(2)" v-show="accountMode == 0">二维码登录</span>
            </div>
            <div class="to-register" v-show="loginMode == 1">
                <span @click="register()">没有账号？去注册</span>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .login-content{
    height: 100%;
    .login-container{
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: calc(100% - 120px);
        .login-header{
            display: flex;
            flex-direction: column;
            align-items: center;
            .login-icon{
                margin-bottom: 1.5vh;
                width: 6.5vh;
                height: 6.5vh;
                background-color: rgb(226, 0, 0);
                img{
                    width: 100%;
                    height: 100%;
                }
            }
            .login-title{
                font: 2.7vh SourceHanSansCN-Bold;
                color: black;
            }
        }
        
        .login-other{
            margin-top: 5.5vh;
            .qrcode-tip{
                font: 13px SourceHanSansCN-Bold;
                color: black;
            }
            .login-method{
                span{
                    font: 12px SourceHanSansCN-Bold;
                    color: rgb(111, 111, 111);
                    transition: 0.2s;
                    &:hover{
                        cursor: pointer;
                        color: black;
                    }
                }
                .separation{
                    margin: 0 4px;
                    pointer-events: none;
                }
            }
            .to-register{
                display: flex;
                justify-content: center;
                span{
                    font: 12px SourceHanSansCN-Bold;
                    color: rgb(111, 111, 111);
                    &:hover{
                        cursor: pointer;
                        color: black;
                    }
                }
            }
        }
    }
  }
  .jumpPage{
    opacity: 0;
    transform: scale(0.4);
    transition: 0.6s 2.2s cubic-bezier(.47,0,.98,.58);
  }
</style>