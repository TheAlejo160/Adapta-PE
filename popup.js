const checkTalkBack = document.getElementById("checkTalkBack");
const checkVoz = document.getElementById("checkVoz");
const selectDaltonismo = document.getElementById("selectDaltonismo");
const checkOjos = document.getElementById("checkOjos");
const hintGestos = document.getElementById("hintGestos");
const hintVoz = document.getElementById("hintVoz");

chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos"], (res) => {
  checkTalkBack.checked = res.talkback || false;
  checkVoz.checked = res.voz || false;
  selectDaltonismo.value = res.daltonismo || "ninguno";
  checkOjos.checked = res.ojos || false;

  hintGestos.style.display = checkOjos.checked ? "block" : "none";
  hintVoz.style.display = checkVoz.checked ? "block" : "none";
});

async function guardarYAvisar() {
  await chrome.storage.local.set({
    talkback: checkTalkBack.checked,
    voz: checkVoz.checked,
    daltonismo: selectDaltonismo.value,
    ojos: checkOjos.checked
  });

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && !tab.url.startsWith("chrome://")) {
    chrome.tabs.sendMessage(tab.id, { accion: "actualizar_estado" }).catch(()=>{});
  }
}

checkTalkBack.addEventListener("change", guardarYAvisar);
checkVoz.addEventListener("change", (e) => {
    hintVoz.style.display = e.target.checked ? "block" : "none";
    guardarYAvisar();
});
selectDaltonismo.addEventListener("change", guardarYAvisar);
checkOjos.addEventListener("change", (e) => {
  hintGestos.style.display = e.target.checked ? "block" : "none";
  guardarYAvisar();
});