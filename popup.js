document.addEventListener('DOMContentLoaded', () => {
  /** @type HTMLSelectElement */
  const elCalcType = document.getElementById('select-calc-type');

  /** 計算種別の説明を表示 */
  const setCalcTypeDescription = () => {
    const elDescription = document.getElementById('calc-type-description');
    if (elCalcType.value === 'anomaly') {
      elDescription.innerHTML = '&lt;スコア計算式&gt;<br>(会心率 x 2) + 会心ダメージ + (異常マスタリー ÷ 3) ';
    } else if (elCalcType.value === 'attack') {
      elDescription.innerHTML = '&lt;スコア計算式&gt;<br>(会心率 x 2) + 会心ダメージ + 攻撃力% ';
    } else {
      elDescription.innerHTML = '';
    }
  };

  elCalcType.addEventListener('change', () => {
    setCalcTypeDescription();
  });

  // 初期状態でのスコア計算の説明を表示
  setCalcTypeDescription();

  document.getElementById('start').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        /** @type HTMLInputElement */
        const elSwitch = document.getElementById('switch-score');
        const showScore = elSwitch.checked;

        const calcType = elCalcType.value;

        chrome.tabs.sendMessage(tabs[0].id, { showScore, calcType }, (response) => {
          console.log('Response from content script:', response);
        });
      }
    });
  });
});
