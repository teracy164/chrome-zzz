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

  const createEvaluationSVG = (evaluation) => {
    // 文字列＋borderだと画像で出力した際に表示崩れするため、画像として埋め込めるようにDOM生成

    // SVGの名前空間を定義
    const svgNS = 'http://www.w3.org/2000/svg';

    // SVG要素を作成
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '24'); // 幅を24pxに設定
    svg.setAttribute('height', '24'); // 高さを24pxに設定
    svg.setAttribute('viewBox', '0 0 24 24'); // 24x24のビュー領域

    // SS・Sの場合は塗りつぶしで光沢感を出す
    const isSpecial = ['SS', 'S'].includes(evaluation);
    if (isSpecial) {
      const color1 = { SS: '#FFAAAA', S: '#FFFFFF' };
      const color2 = { SS: '#CC0000', S: '#FFA500' };
      // <defs>を追加してグラデーション定義を入れる
      const defs = document.createElementNS(svgNS, 'defs');

      // リニアグラデーションを作成 (金色の光沢を表現)
      const gradient = document.createElementNS(svgNS, 'linearGradient');
      gradient.setAttribute('id', 'gold-gradient');
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '100%');
      gradient.setAttribute('y2', '100%');

      // グラデーションストップを追加
      const stop1 = document.createElementNS(svgNS, 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', color1[evaluation]);

      const stop2 = document.createElementNS(svgNS, 'stop');
      stop2.setAttribute('offset', '50%');
      stop2.setAttribute('stop-color', color2[evaluation]); // 中央を暗めにすることで光沢を表現

      const stop3 = document.createElementNS(svgNS, 'stop');
      stop3.setAttribute('offset', '100%');
      stop3.setAttribute('stop-color', color1[evaluation]);

      // グラデーションにストップを追加
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      gradient.appendChild(stop3);

      // defsにグラデーションを追加
      defs.appendChild(gradient);
      svg.appendChild(defs);
    }

    const color = { SS: 'white', S: 'black', A: 'crimson', B: 'skyblue', C: 'white' };

    // 円の要素を作成
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12'); // 円の中心X座標
    circle.setAttribute('cy', '12'); // 円の中心Y座標
    circle.setAttribute('r', '11'); // 半径
    if (isSpecial) {
      circle.setAttribute('fill', 'url(#gold-gradient)'); // グラデーションを適用
    } else {
      circle.setAttribute('fill', 'none'); // 内側を透明に
      circle.setAttribute('stroke', color[evaluation]); // 輪郭を青色に
      circle.setAttribute('stroke-width', '2'); // 輪郭の幅を2pxに設定
    }

    const positionX = { SS: '11.5', S: '12', A: '11.5', B: '12', C: '11.5' };
    const positionY = { SS: '17', S: '18', A: '18', B: '18', C: '18' };
    // テキストの要素を作成
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', positionX[evaluation]);
    text.setAttribute('y', positionY[evaluation]); // Y座標は少し下に調整
    text.setAttribute('text-anchor', 'middle'); // テキストを中央揃え
    text.setAttribute('font-size', evaluation === 'SS' ? '13' : '18'); // フォントサイズを12pxに設定
    // MEMO: imgタグで表示するとfont-familyが適用されなくなる
    text.setAttribute('font-family', 'inpin hongmengti');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', color[evaluation]); // テキストの色を評価ごとに設定
    text.textContent = evaluation; // 表示する文字

    // SVGに円を追加
    svg.appendChild(circle);
    svg.appendChild(text);

    return svg;
  };

  const getEvaluationImg = (evaluation) => {
    const svg = createEvaluationSVG(evaluation);
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const encodedSvg = encodeURIComponent(svgString);
    const img = document.createElement('img');
    img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    return img;
  };

  const finish = () => {
    // 公式の装備の枠に詳細情報を埋め込む
    const officialEquipPanel = document.getElementsByClassName('equipment-info')?.item(0);
    if (officialEquipPanel) {
      // 宣伝用パネル
      const pr = document.createElement('div');
      pr.style.position = 'relative';
      pr.style.paddingRight = '1.6cm';
      pr.style.lineHeight = '1em';
      pr.innerHTML = 'Created by<br>ZZZ Score Calculator';
      // Chrome拡張へのQRコード
      const qrImageUrl = chrome.runtime.getURL('public/images/qr_code.png');
      const qr = document.createElement('img');
      qr.src = qrImageUrl;
      qr.style.position = 'absolute';
      qr.style.right = '0';
      qr.style.bottom = '0';
      qr.style.width = '1.5cm';
      qr.style.height = '1.5cm';
      // 画像の読み込み失敗時はimgタグを消す
      qr.onerror = () => {
        pr.style.paddingRight = '0';
        qr.remove();
      };
      pr.appendChild(qr);

      if (showScore) {
        // スコア表示
        const scorePanel = document.createElement('div');
        scorePanel.style.position = 'relative';
        scorePanel.style.display = 'flex';
        scorePanel.style.marginBottom = '0.5em';
        const eScore = document.createElement('span');
        eScore.style.fontFamily = 'inpin hongmengti';
        eScore.style.color = 'rgba(255,255,255,.9)';
        eScore.style.fontSize = '6mm';
        eScore.style.position = 'relative';
        eScore.style.lineHeight = '6mm';

        eScore.innerHTML = `Score&emsp;${totalScore}`;

        if (showEvaluation) {
          // ドライバの平均値で評価
          const avScore = Math.floor(totalScore / 6);
          const evaluation = evaluate(avScore);
          const img = getEvaluationImg(evaluation);
          img.style.width = '8mm';
          // paddingやmarginで位置を調整すると画像出力時に崩れるため、absoluteで直接指定する
          img.style.position = 'absolute';
          img.style.bottom = '0';
          img.style.left = 'calc(100% + 5mm)';
          eScore.appendChild(img);
        }
        scorePanel.appendChild(eScore);

        pr.style.position = 'absolute';
        pr.style.right = '0';
        pr.style.bottom = '0';
        scorePanel.appendChild(pr);

        // スコア表示を追加
        customPanel.appendChild(scorePanel);
      } else {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'flex-end';
        header.appendChild(pr);
        customPanel.appendChild(header);
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

    // ドライバごとの表示枠
    // 発動中のセット効果枠に合わせた見た目にする
    const equipDetail = document.createElement('div');
    equipDetail.style.backgroundColor = '#242424';
    // 発動中のセット効果枠はboxShadowで枠線に色を付けているが、画像出力時におかしくなるため、borderColorで同じような見た目にする
    // equipDetail.style.boxShadow = '-1px -1px 1.1px 0px rgba(255,255,255,.1),0px 4px 4px 0px rgba(0,0,0,.1) inset';
    equipDetail.style.borderLeft = '1px solid rgba(255,255,255,.1)';
    equipDetail.style.borderTop = '1px solid rgba(255,255,255,.1)';
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
          driverName.style.fontFamily = 'inpin hongmengti';
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
    statusPanel.style.paddingTop = '0.5em';

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
        statusPanel.appendChild(document.createElement('hr'));

        const fontSize = '5mm';

        if (showEvaluation) {
          statusPanel.style.paddingBottom = '6.5mm';
          statusPanel.style.position = 'relative';
          // 評価の画像が画像出力時にずれてしまうため、違和感を少しでも下げるために、
          // スコア表示と離して表示
          const eScore = document.createElement('div');
          eScore.innerHTML = `Score&emsp;${equipScore}`;
          eScore.style.fontFamily = '"inpin hongmengti"';
          eScore.style.color = 'rgba(255, 255, 255, 0.9)';
          eScore.style.fontSize = fontSize;
          eScore.style.position = 'absolute';
          eScore.style.bottom = '0';
          eScore.style.lineHeight = fontSize;
          statusPanel.appendChild(eScore);
          // 評価を表示
          const evaluation = evaluate(equipScore);
          const img = getEvaluationImg(evaluation);
          img.style.position = 'absolute';
          img.style.bottom = '0';
          img.style.right = '0';
          img.style.width = '6mm';
          statusPanel.appendChild(img);
        } else {
          const e = document.createElement('div');
          e.style.display = 'flex';
          e.style.justifyContent = 'space-between';
          e.style.fontFamily = '"inpin hongmengti"';
          e.style.color = 'rgba(255, 255, 255, 0.9)';
          e.style.fontSize = fontSize;
          e.style.lineHeight = `calc(${fontSize} + 2mm)`;

          const eLabel = document.createElement('div');
          eLabel.innerText = 'Score';
          e.appendChild(eLabel);
          const eScore = document.createElement('div');
          eScore.innerText = equipScore;
          e.appendChild(eScore);

          statusPanel.appendChild(e);
        }
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
