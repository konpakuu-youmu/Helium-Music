const { ipcMain, shell, dialog, globalShortcut, Menu, clipboard } =  require('electron')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { parseFile } = require('music-metadata')
// const jsmediatags = require("jsmediatags");
const registerShortcuts = require('./shortcuts')
const Store = require('electron-store')
const CancelToken = axios.CancelToken
let cancel = null

module.exports = IpcMainEvent = (win, app) => {
    const settingsStore = new Store({name: 'settings'})
    const lastPlaylistStore = new Store({name: 'lastPlaylist'})
    const musicVideoStore = new Store({name: 'musicVideo'})
    // win.on('restore', () => {
        // win.webContents.send('lyric-control')
    // })
    ipcMain.on('window-min', () => {
        win.minimize()
    })
    ipcMain.on('window-max', () => {
        if(win.isMaximized()){
            win.restore()
        }else{
            win.maximize()
        }
    })
    ipcMain.on('window-close', async () => {
        const settings = await settingsStore.get('settings')
        if(settings.other.quitApp == 'minimize') {
            win.hide()
        } else if(settings.other.quitApp == 'quit') {
            win.close()
        }
    })
    ipcMain.on('to-register', (e, url) => {
        shell.openExternal(url)
    })
    ipcMain.on('download-start', () => {
        win.webContents.send('download-next')
    })
    ipcMain.handle('get-image-base64', async (e, filePath) => {
        const data = await parseFile(filePath)
        if(data.common.picture) 
            return `data:${data.common.picture[0].format};base64,${data.common.picture[0].data.toString('base64')}`
        else
            return null
    })
    ipcMain.on('set-settings', (e, settings) => {
        settingsStore.set('settings', JSON.parse(settings))
        registerShortcuts(win)
    })
    ipcMain.handle('get-settings', async () => {
        const settings =  await settingsStore.get('settings')
        if(settings) return settings
        else {
            let initSettings = {
                music: {
                    level: 'standard',
                    lyricSize: '20',
                    tlyricSize: '14',
                    rlyricSize: '12',
                    lyricInterlude: 13
                },
                local: {
                    videoFolder: null,
                    downloadFolder: null,
                    localFolder: []
                },
                shortcuts: [
                    {
                        id: 'play',
                        name: '播放/暂停',
                        shortcut: 'CommandOrControl+P',
                        globalShortcut: 'CommandOrControl+Alt+P',
                    },
                    {
                        id: 'last',
                        name: '上一首',
                        shortcut: 'CommandOrControl+Left',
                        globalShortcut: 'CommandOrControl+Alt+Left',
                    },
                    {
                        id: 'next',
                        name: '下一首',
                        shortcut: 'CommandOrControl+Right',
                        globalShortcut: 'CommandOrControl+Alt+Right',
                    },
                    {
                        id: 'volumeUp',
                        name: '增加音量',
                        shortcut: 'CommandOrControl+Up',
                        globalShortcut: 'CommandOrControl+Alt+Up',
                    },
                    {
                        id: 'volumeDown',
                        name: '减少音量',
                        shortcut: 'CommandOrControl+Down',
                        globalShortcut: 'CommandOrControl+Alt+Down',
                    },
                    {
                        id: 'processForward',
                        name: '快进(3s)',
                        shortcut: 'CommandOrControl+]',
                        globalShortcut: 'CommandOrControl+Alt+]',
                    },
                    {
                        id: 'processBack',
                        name: '后退(3s)',
                        shortcut: 'CommandOrControl+[',
                        globalShortcut: 'CommandOrControl+Alt+[',
                    },
                ],
                other: {
                    globalShortcuts: true,
                    quitApp:'minimize'
                }
            }
            settingsStore.set('settings', initSettings)
            registerShortcuts(win)
            return initSettings
        }
    })
    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({properties: ['openDirectory']})
        if (canceled) {
            return null
        } else {
            return filePaths[0]
        }
    })
    ipcMain.on('register-shortcuts', () => {
        registerShortcuts(win)
    })
    ipcMain.on('unregister-shortcuts', () => {
        Menu.setApplicationMenu(null)
        globalShortcut.unregisterAll()
    })
    ipcMain.on('save-last-playlist', (e, playlist) => {
        lastPlaylistStore.set('playlist', JSON.parse(playlist))
    })
    ipcMain.on('exit-app', (e, playlist) => {
        lastPlaylistStore.set('playlist', JSON.parse(playlist))
        app.exit()
    })
    ipcMain.handle('get-last-playlist', async () => {
        const lastPlaylist =  await lastPlaylistStore.get('playlist')
        if(lastPlaylist) return lastPlaylist
        else return null
    })
    ipcMain.on('open-local-folder', (e, path) => {
        shell.showItemInFolder(path)
    })
    ipcMain.handle('get-request-data', async (e, request) => {
        const result = await axios.get(request.url, request.option)
        return result.data
    })
    async function searchMusicVideo(id) {
        if(musicVideoStore.has('musicVideo')) {
            const result = await musicVideoStore.get('musicVideo')
            const index = (result || []).findIndex((music) => music.id == id)
            if(index != -1) {
                return {data: result[index], index: index}
            } else return false
        } else return false
    }
    async function saveMusicVideo(data) {
        if(musicVideoStore.has('musicVideo')) {
            const musicVideo = await musicVideoStore.get('musicVideo')
            searchMusicVideo(data.id).then(result => {
                if(result) musicVideo.splice(result.index, 1)
                musicVideo.push(data)
                musicVideoStore.set('musicVideo', musicVideo)
            })
        } else {
            musicVideoStore.set('musicVideo', [data])
        }
    }
    function fileIsExists(path) { 
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (!err) resolve(true)
                else return resolve(false)
            })
        })
    }
    ipcMain.handle('get-bili-video', async (e, request) => {
        const settings = await settingsStore.get('settings')
        if(!settings.local.videoFolder) return 'noSavePath'
        const path = settings.local.videoFolder + "\\" + request.option.params.cid + '_'+ request.option.params.quality.substring(3) + '.mp4'
        let returnCode = 'success'
        if(await fileIsExists(path)) {
            request.option.params.timing = JSON.parse(request.option.params.timing)
            request.option.params.path = path
            saveMusicVideo(request.option.params)
            return returnCode
        } else {
            if(cancel != null) cancel()
            const result = await axios({
                url: request.url,
                method: 'get',
                headers: request.option.headers,
                responseType: 'stream',
                onDownloadProgress:(progressEvent)=>{
                    let progress = Math.round( progressEvent.loaded / progressEvent.total*100)
                    win.webContents.send('download-video-progress', progress)
                    if(returnCode == 'cancel') win.setProgressBar(-1)
                    else win.setProgressBar(progress / 100)
                },
                cancelToken: new CancelToken(function executor(c) {
                    cancel = c
                })
            })
            const writer = fs.createWriteStream(path)
            await result.data.pipe(writer)
            ipcMain.on('cancel-download-music-video', () => {
                returnCode = 'cancel'
                writer.close()
                writer.once('close', () => {
                    cancel()
                    win.setProgressBar(-1)
                    fs.unlinkSync(path)
                })
            })
            return new Promise((resolve, reject) => {
                writer.on("finish", () => {
                    win.setProgressBar(-1)
                    if(returnCode == 'cancel') {
                        resolve(returnCode)
                        return returnCode
                    }
                    request.option.params.timing = JSON.parse(request.option.params.timing)
                    request.option.params.path = path
                    saveMusicVideo(request.option.params)
                    resolve(returnCode)
                })
                writer.on("error", () => {
                    win.setProgressBar(-1)
                    reject('failed')
                })
            })
        }
    })
    ipcMain.handle('music-video-isexists', async (e, obj) => {
        const result = await searchMusicVideo(obj.id)
        if(result) {
            if(obj.method == 'get') return result
            const file = await fileIsExists(result.data.path)
            if(!file) return '404'
            else return result
        } else return false
    })
    ipcMain.handle('clear-unused-video', async (e) => {
        const settings = await settingsStore.get('settings')
        const folderPath = settings.local.videoFolder
        if(!folderPath) return 'noSavePath'
        const musicVideo = await musicVideoStore.get('musicVideo')
        const files = fs.readdirSync(folderPath)
        files.forEach(filename => {
            const filePath = path.join(folderPath, filename)
            if(!musicVideo.some(video => video.path == filePath)) {
              console.log(filePath)
                fs.unlinkSync(filePath)
            }
        })
        return true
    })
    ipcMain.handle('delete-music-video', async (e, id) => {
        const musicVideo = await musicVideoStore.get('musicVideo')
        return new Promise((resolve, reject) => {
            searchMusicVideo(id).then(result => {
                if(result) {
                    musicVideo.splice(result.index, 1)
                    musicVideoStore.set('musicVideo', musicVideo)
                    resolve(true)
                } else resolve(false)
            })
        })
    })
    //获取本地歌词
    ipcMain.handle('get-local-music-lyric', async (e, filePath) => {
        // async function getLyricByFile(filePath) {
        //     return new Promise((resolve, reject) => {
        //         jsmediatags.read(filePath, {
        //             onSuccess: (tag) => {
        //                 resolve(tag)
        //             },
        //             onError: (error) => {
        //                 console.log(':(', error.type, error.info);
        //                 reject(error)
        //             }
        //         });
        //     })
        // }
        // return await getLyricByFile(filePath)
        const str = filePath.split('\\')
        const folderPath = filePath.substring(0, filePath.length - str[str.length - 1].length - 1)
        const fileName = path.basename(filePath, path.extname(filePath))
        async function readLyric(path) {
            return fs.readFileSync(path, 'utf8', (err, data) => {
                if (err) return false
                else return data
            })
        }
        function lyricHandle(data) {
            const lines = data.split(/\r?\n/)
            let lyricArr = ''
            lines.forEach((line) => {
                if(line) lyricArr += line + '\n'
            })
            return lyricArr
        }
        if(await fileIsExists(folderPath + '\\' + fileName + '.lrc')) {
            const res = await readLyric(folderPath + '\\' + fileName + '.lrc')
            if(res) return lyricHandle(res)
        }
        if(await fileIsExists(folderPath + '\\' + fileName + '.txt')) {
            const res = await readLyric(folderPath + '\\' + fileName + '.txt')
            if(res) return lyricHandle(res)
        }
        const metedata = await parseFile(filePath)
        if(metedata.common.lyrics) return metedata.common.lyrics[0]
        
        return false
    })
    ipcMain.on('copy-txt', (e, txt) => {
        clipboard.writeText(txt)
    })
    ipcMain.on('set-window-title', (e, title) => {
        win.setTitle(title)
    })
}