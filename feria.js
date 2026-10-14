/* Música de fondo: "Oiga, mire, vea" desde YouTube (se inicia al pulsar "Entrar") */
const YT_ID = "KnCWt228Kv8";
let ytp = null, ytReady = false, ytWant = false;
window.onYouTubeIframeAPIReady = () => {
  ytp = new YT.Player("ytPlayer", {
    width: "200", height: "200", videoId: YT_ID,
    playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: YT_ID, playsinline: 1, rel: 0 },
    events: {
      onReady: () => { ytReady = true; ytp.setVolume(55); if (ytWant) ytp.playVideo(); },
      onError: () => toast("No se pudo cargar la música (abre la página desde un servidor, no con doble clic)")
    }
  });
};
document.head.appendChild(Object.assign(document.createElement("script"), { src: "https://www.youtube.com/iframe_api" }));
Music.start = function () { if (!Sound.on) return; ytWant = true; this.active = true; if (ytReady) ytp.playVideo(); };
Music.stop  = function () { ytWant = false; this.active = false; if (ytReady) ytp.pauseVideo(); };
