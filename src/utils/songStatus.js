import { useUserStore } from "../store/userStore"
import { isLogin } from "./authority"

const { user } = useUserStore()
function checkSongPlayable(song, _privilege) {
  let privilege = _privilege;
  if(privilege === undefined){
    privilege = song?.privilege
  }

  let status = {
    playable: true,
    reason: ''
  }
  if (song?.privilege?.pl > 0)
    return status

  if (song.fee === 1 || privilege?.fee === 1) {
    status.vipOnly = true
    // 非VIP会员
    if (!(isLogin() && user.vipType === 11)) {
      status.playable = false
      status.reason = '仅限 VIP 会员'
    }
  } else if (song.fee === 4 || privilege?.fee === 4) {
    status.playable = false
    status.reason = '付费专辑'
  } else if (song.noCopyrightRcmd !== null && song.noCopyrightRcmd !== undefined) {
    status.playable = false
    status.reason = '无版权'
  } else if ( privilege?.st < 0 && isLogin()) {
    status.playable = false
    status.reason = '已下架'
  }
  return status
}

// 只有调用 getPlaylistAll接口时，才需传入privileges数组
export function mapSongsPlayableStatus(songs, privilegeList = []) {
  if(songs?.length === undefined) return

  if(privilegeList.length === 0){
    return songs.map(song => {
      Object.assign(song, { ...checkSongPlayable(song) })
      return song
    })
  }

  return songs.map((song, i) => {
    Object.assign(song, { ...checkSongPlayable(song, privilegeList[i]) })
    return song
  })
}