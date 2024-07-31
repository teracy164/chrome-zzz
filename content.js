chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // 公式の戦績ツールからドライバアイコンのDOMを取得
    const officialEquipElements = document.querySelectorAll('.equip-info');
    if (!officialEquipElements.length) return;

    const oldPanel = document.getElementById('custom-equip-panel');
    if (oldPanel) {
        oldPanel.remove();
    }

    // モバイルの場合はhtml事態が違うようなので、パスで判断する
    const isMobile = location.pathname.endsWith('m.html');

    /** DOM取得（描画されるまで待つ） */
    const getElementByClassNameAsync = (className) => {
        return new Promise(resolve => {
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
        })
    }

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
        let score = 0
        const toNum = (str) => {
            const matches = str?.match(/^([0-9.]*)%?$/);
            return matches?.length ? Number(matches[1]) : 0;
        }
        switch (name) {
            case '会心率':
            case 'CRIT Rate':
            case '暴击率':
            case '暴擊率':
                score = toNum(value) * 2;
                break;
            case '会心ダメージ':
            case 'CRIT DMG':
            case '暴击伤害':
            case '暴擊傷害':
                score = toNum(value);
                break;
            case '攻撃力':
            case 'ATK':
            case '攻击力':
            case '攻擊力':
                if (value.endsWith('%')) {
                    // 攻撃力は実数もあるため、％の場合のみ加算
                    score = toNum(value);
                }
                break;
        }

        return score;
    }

    const finish = () => {
        // 公式の装備の枠に詳細情報を埋め込む
        const officialEquipPanel = document.getElementsByClassName('equipment-info')?.item(0);
        if (officialEquipPanel) {
            if (message.showScore) {
                // スコア表示
                const scorePanel = document.createElement('div');
                scorePanel.style.fontFamily = 'inpin hongmengti';
                scorePanel.style.color = 'rgba(255,255,255,.9)'
                scorePanel.style.fontSize = '16px';
                scorePanel.innerHTML = `<span>Score</span><span style="margin-left: 1em">${totalScore}</span>`;
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
    }

    /** まるめ誤差対策 */
    const addScore = (sum, score) => {
        return Math.floor((sum + score) * 10) / 10;
    }

    const dequeue = async () => {
        if (!queue.length) return finish();

        // ドライバを1つずつクリックして詳細モーダルを表示させる
        queue.shift().click();

        // モーダルに表示された情報を取得していく
        const modal = await getElementByClassNameAsync('van-popup');
        if (modal) {
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


                    // 公式のCSSを聞かせるために「popup-content」クラスを付けたdivでラッピングする
                    const wrapper = document.createElement('div');
                    wrapper.className = 'role-detail-popup equip-popup';

                    const wrapper2 = document.createElement('div');
                    wrapper2.className = 'popup-content';

                    wrapper2.appendChild(baseInfo);
                    wrapper.appendChild(wrapper2);
                    equipDetail.appendChild(wrapper)
                }
            }

            // ランダムステータスのDOMを取得
            const sts = modal.getElementsByClassName('upper-attrs')?.item(0);
            if (sts) {
                const statusPanel = document.createElement('div');
                statusPanel.style.padding = '0.5em';

                let equipScore = 0;
                const spans = sts.getElementsByTagName('span');
                for (let i = 0; i < spans.length; i++) {
                    const name = spans.item(i++)?.innerText;
                    const value = spans.item(i).innerText;
                    if (name && value) {
                        const e = document.createElement('div');
                        e.style.display = 'flex';
                        e.style.justifyContent = 'space-between';

                        const elName = document.createElement('div')
                        elName.innerText = name;
                        e.appendChild(elName);

                        const elValue = document.createElement('div')
                        elValue.innerText = value;
                        e.appendChild(elValue);

                        statusPanel.appendChild(e);

                        equipScore = addScore(equipScore, calcScore(name, value));
                    }
                }

                if (message.showScore) {
                    const e = document.createElement('div');
                    e.style.display = 'flex';
                    e.style.justifyContent = 'space-between';
                    e.style.fontFamily = '"inpin hongmengti"';
                    e.style.color = 'rgba(255, 255, 255, 0.9)';
                    e.style.fontSize = '16px';

                    const elName = document.createElement('div')
                    elName.innerText = 'Score';
                    e.appendChild(elName);

                    const elValue = document.createElement('div')
                    elValue.innerText = equipScore;
                    e.appendChild(elValue);

                    statusPanel.appendChild(document.createElement('hr'));
                    statusPanel.appendChild(e);
                }

                equipDetail.appendChild(statusPanel);
                customEquipPanel.appendChild(equipDetail)

                totalScore = addScore(totalScore, equipScore);
            }
            modal.style.opacity = 'unset';
        }

        dequeue();
    }

    // 順番に処理するためキューイングして1つずつ処理を実施
    officialEquipElements.forEach(e => queue.push(e))
    dequeue();

    sendResponse({ result: true });
});
