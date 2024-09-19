chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  /** @type {'attack' | 'anomaly'} */
  const calcType = message.calcType;
  /** @type {boolean} */
  const showScore = message.showScore;
  /** @type {boolean} */
  const showEvaluation = message.showEvaluation;

  // 公式の戦績ツールからドライバアイコンのDOMを取得
  const officialEquipElements = document.querySelectorAll('.equip-info');
  if (!officialEquipElements.length) return;

  const oldPanel = document.getElementById('custom-equip-panel');
  if (oldPanel) {
    oldPanel.remove();
  }

  // モバイルの場合はhtml事態が違うようなので、パスで判断する
  const isMobile = location.pathname.endsWith('m.html');

  /** DOM取得（描画されるまで待つ） @return {HTMLElement} */
  const getElementByClassNameAsync = (className) => {
    return new Promise((resolve) => {
      const wait = (cnt = 0) => {
        const el = document.getElementsByClassName(className)?.item(0);
        if (el) {
          resolve(el);
        } else {
          if (cnt < 100) {
            setTimeout(() => wait(cnt + 1), 10);
          }
        }
      };

      wait();
    });
  };

  /** 埋め込む一番外側のDOM */
  const customPanel = document.createElement('div');
  customPanel.id = 'custom-equip-panel';
  customPanel.style.color = 'rgba(255,255,255,.35)';

  customPanel.style.padding = isMobile ? '1em 0' : '1em';

  /** ドライバ情報を表示するためのDOM */
  const customEquipPanel = document.createElement('div');
  customEquipPanel.style.display = 'flex';
  customEquipPanel.style.justifyContent = 'space-between';
  customEquipPanel.style.flexWrap = 'wrap';

  /** @type HTMLElement[] */
  const queue = [];
  let totalScore = 0;

  const calcScore = (name, value) => {
    let score = 0;
    const toNum = (str) => {
      const matches = str?.match(/^([0-9.]*)%?$/);
      return matches?.length ? Number(matches[1]) : 0;
    };
    switch (name) {
      case '会心率':
      case 'CRIT Rate': // EN ID TH
      case '暴击率':
      case '暴擊率':
      case 'Шанс крит. попадания':
      case '치명타 확률':
      case 'KRIT-Rate': // DE
      case 'Probabilidad de Crítico': //ES
      case 'Taux CRIT': //FR
      case 'Taxa CRIT': //PT
      case 'Tỷ Lệ Bạo Kích': // VN
        score = toNum(value) * 2;
        break;
      case '会心ダメージ':
      case 'CRIT DMG': // EN ID TH
      case '暴击伤害':
      case '暴擊傷害':
      case 'Крит. урон':
      case '치명타 피해':
      case 'KRIT-SCH': // DE
      case 'Daño Crítico': //ES
      case 'DGT CRIT': //FR
      case 'Dano CRIT': //PT
      case 'DMG Bạo Kích': //VN
        score = toNum(value);
        break;
      case '攻撃力':
      case 'ATK': // EN ID TH
      case '攻击力':
      case '攻擊力':
      case 'Сила атаки':
      case '공격력':
      case 'ANG': // DE
      case 'Ataque': //ES
      case 'ATQ': //FR PT
      case 'Tấn Công': //VN
        if (calcType === 'attack') {
          if (value.endsWith('%')) {
            // 攻撃力は実数もあるため、％の場合のみ加算
            score = toNum(value);
          }
        }
        break;
      case '異常マスタリー':
      case 'Anomaly Proficiency': // EN ID
      case '异常精通': // 簡体字
      case '異常精通': // 繁体字
      case 'Anomaliekunde': // DE
      case 'Maestría de Anomalía': // ES
      case "Adresse d'anomalie": // FR
      case '이상 마스터리': // KR
      case 'Proficiência de Anomalia': // PT
      case 'Знание аномалии': // RU
      case 'ความชำนาญ Anomaly': // TH
      case 'Tinh Thông Dị Thường': // VN
        if (calcType === 'anomaly') {
          // 異常マスタリーは最低値が9のため、攻撃力%（最低値3）に合わせるため1/3にして計算
          score = Math.floor((toNum(value) * 10) / 3) / 10;
        }
        break;
    }

    return score;
  };

  const evaluate = (score) => {
    if (score >= 30) {
      return 'SS';
    } else if (score >= 25) {
      return 'S';
    } else if (score >= 20) {
      return 'A';
    } else if (score >= 15) {
      return 'B';
    } else {
      return 'C';
    }
  };

  const getEvaluationSpan = (score) => {
    const evaluation = evaluate(score);
    const styles = [
      'margin: 0 0.25em',
      'border: 2px solid white',
      'border-radius: 50%',
      'width: 1.5em',
      'height: 1.5em',
      'padding: 0 0.25em',
    ];
    const colors = {
      SS: 'yellow',
      S: 'yellow',
      A: 'crimson',
      B: 'skyblue',
      C: 'white',
    };
    styles.push(`color: ${colors[evaluation]}`);
    styles.push(`border-color: ${colors[evaluation]}`);
    return `<span style="${styles.join(';')}">${evaluation}</span>`;
  };

  const finish = () => {
    // 公式の装備の枠に詳細情報を埋め込む
    const officialEquipPanel = document.getElementsByClassName('equipment-info')?.item(0);
    if (officialEquipPanel) {
      if (showScore) {
        // スコア表示
        const scorePanel = document.createElement('div');
        scorePanel.style.fontFamily = 'inpin hongmengti';
        scorePanel.style.color = 'rgba(255,255,255,.9)';
        scorePanel.style.fontSize = '16px';

        if (showEvaluation) {
          // ドライバの平均値で評価
          const avScore = Math.floor(totalScore / 6);
          const evaluation = getEvaluationSpan(avScore);
          scorePanel.innerHTML = `<span>Score</span><span style="margin-left: 1em">${totalScore}${evaluation}</span>`;
        } else {
          scorePanel.innerHTML = `<span>Score</span><span style="margin-left: 1em">${totalScore}</span>`;
        }
        // スコア表示を追加
        customPanel.appendChild(scorePanel);
      }
      // ドライバ詳細を追加
      customPanel.appendChild(customEquipPanel);

      // 高さ指定されているため、表示崩れ防止のために高さ指定削除
      officialEquipPanel.style.height = 'unset';
      // 公式の装備欄の末尾に追加
      officialEquipPanel.appendChild(customPanel);
    }

    // ドライバ詳細モーダルを閉じる
    document.getElementsByClassName('van-overlay')?.item(0)?.click();
  };

  /** まるめ誤差対策 */
  const addScore = (sum, score) => {
    return Math.floor((sum + score) * 10) / 10;
  };

  const dequeue = async () => {
    if (!queue.length) return finish();

    // ドライバを1つずつクリックして詳細モーダルを表示させる
    queue.shift().click();

    // モーダルに表示された情報を取得していく
    const modal = await getElementByClassNameAsync('van-popup');
    if (!modal) return;
    // ちらつかないようにモーダルは透明にしておく
    modal.style.opacity = '0';

    const equipDetail = document.createElement('div');
    equipDetail.style.backgroundColor = '#242424';
    equipDetail.style.boxShadow = '-1px -1px 1.1px 0px rgba(255,255,255,.1),0px 4px 4px 0px rgba(0,0,0,.1) inset';
    equipDetail.style.borderRadius = '16px';
    equipDetail.style.width = `calc(${isMobile ? '100%' : '33%'} - 0.5em)`;
    equipDetail.style.padding = '12px 24px';
    equipDetail.style.margin = '0.25em';
    customEquipPanel.appendChild(equipDetail);

    // 名称やレベル、ドライバ画像等の基本情報
    const content = modal.getElementsByClassName('popup-content')?.item(0);
    if (content) {
      // 名前や画像、レベルのところはクローンしてそのまま使う
      const baseInfo = content.getElementsByTagName('div')?.item(0)?.cloneNode(true);
      if (baseInfo) {
        const driverName = baseInfo.getElementsByTagName('p')?.item(0);
        if (driverName) {
          driverName.style.height = 'unset';
        }

        // 公式のCSSを効かせるために「popup-content」クラスを付けたdivでラッピングする
        const wrapper = document.createElement('div');
        wrapper.className = 'role-detail-popup equip-popup';

        const wrapper2 = document.createElement('div');
        wrapper2.className = 'popup-content';

        wrapper2.appendChild(baseInfo);
        wrapper.appendChild(wrapper2);
        equipDetail.appendChild(wrapper);
      }
    }

    /** ステータス行DOM生成 @return {HTMLElement} */
    const createStatusRowElement = (name, value) => {
      const e = document.createElement('div');
      e.style.display = 'flex';
      e.style.justifyContent = 'space-between';

      const elName = document.createElement('div');
      elName.innerText = name;
      e.appendChild(elName);

      const elValue = document.createElement('div');
      elValue.innerText = value;
      e.appendChild(elValue);

      return e;
    };

    const statusPanel = document.createElement('div');
    statusPanel.style.padding = '0.5em';

    // メインステータスのDOMを取得
    const mainSts = modal.getElementsByClassName('base-attrs')?.item(0);
    if (mainSts) {
      const spans = mainSts.getElementsByTagName('span');
      if (spans.length) {
        const name = spans.item(0)?.innerText;
        const value = spans.item(1)?.innerText;
        if (name && value) {
          const e = createStatusRowElement(name, value);
          e.style.color = 'rgba(255, 255, 255, 0.9)';
          e.style.borderBottom = '1px solid #333';
          statusPanel.appendChild(e);
        }
      }
    }

    // ランダムステータスのDOMを取得
    const subSts = modal.getElementsByClassName('upper-attrs')?.item(0);
    if (subSts) {
      let equipScore = 0;
      const spans = subSts.getElementsByTagName('span');
      for (let i = 0; i < spans.length; i++) {
        const name = spans.item(i++)?.innerText;
        const value = spans.item(i).innerText;
        if (name && value) {
          statusPanel.appendChild(createStatusRowElement(name, value));

          equipScore = addScore(equipScore, calcScore(name, value));
        }
      }

      if (showScore) {
        const e = document.createElement('div');
        e.style.display = 'flex';
        e.style.justifyContent = 'space-between';
        e.style.fontFamily = '"inpin hongmengti"';
        e.style.color = 'rgba(255, 255, 255, 0.9)';
        e.style.fontSize = '16px';

        const elName = document.createElement('div');
        elName.innerText = 'Score';
        e.appendChild(elName);

        const elValue = document.createElement('div');
        if (showEvaluation) {
          // 評価を表示
          const evaluation = getEvaluationSpan(equipScore);
          const elEvaluation = document.createElement('span');
          elEvaluation.innerHTML = evaluation;
          elValue.innerHTML = `${equipScore}${evaluation}`;
        } else {
          elValue.innerText = equipScore;
        }
        e.appendChild(elValue);

        statusPanel.appendChild(document.createElement('hr'));
        statusPanel.appendChild(e);
      }

      totalScore = addScore(totalScore, equipScore);
    }
    equipDetail.appendChild(statusPanel);
    customEquipPanel.appendChild(equipDetail);

    modal.style.opacity = 'unset';

    dequeue();
  };

  // 順番に処理するためキューイングして1つずつ処理を実施
  officialEquipElements.forEach((e) => queue.push(e));
  dequeue();

  sendResponse({ result: true });
});
