// content.js

(function () {
    console.log('Content script loaded');

    // equip-infoクラスを持つ要素を全て取得
    const equipElements = document.querySelectorAll('.equip-info');
    console.log('Found', equipElements.length, 'equip-info elements');

    const oldPanel = document.getElementById('custom-equip-panel');
    if (oldPanel) {
        oldPanel.remove();
    }

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


    const customPanel = document.createElement('div');
    customPanel.id = 'custom-equip-panel';
    customPanel.style.color = 'rgba(255,255,255,.35)';
    customPanel.style.padding = '1em';

    const customEquipPanel = document.createElement('div');
    customEquipPanel.style.display = 'flex';
    customEquipPanel.style.justifyContent = 'space-between';
    customEquipPanel.style.flexWrap = 'wrap';


    /** @type HTMLElement[] */
    const queue = [];
    let totalScore = 0;

    const calcScore = (name, value) => {
        const toNum = (str) => {
            const matches = str?.match(/^([0-9.]*)%?$/);
            if (matches?.length) {
                return Number(matches[1]);
            }
            return null;
        }
        switch (name) {
            case '会心率':
            case 'CRIT Rate':
            case '暴击率':
            case '暴擊率':
                totalScore += toNum(value) * 2;
                break;
            case '会心ダメージ':
            case 'CRIT DMG':
            case '暴击伤害':
            case '暴擊傷害':
                totalScore += toNum(value);
                break;
            case '攻撃力':
            case 'ATK':
            case '攻击力':
            case '攻擊力':
                if (value.endsWith('%')) {
                    // 攻撃力は実数もあるため、％の場合のみ加算
                    totalScore += toNum(value);
                }
                break;
        }

        // まるめ誤差対策
        totalScore = Math.floor(totalScore * 10) / 10;
    }

    const finish = () => {
        // 公式の装備の枠に詳細情報を埋め込む
        const officialEquipPanel = document.getElementsByClassName('equipment-info')?.item(0);
        if (officialEquipPanel) {
            // スコア表示
            const scorePanel = document.createElement('div');
            scorePanel.style.fontFamily = 'inpin hongmengti';
            scorePanel.style.color = 'rgba(255,255,255,.9)'
            scorePanel.style.fontSize = '16px';
            scorePanel.innerText = `score: ${totalScore}`;
            customPanel.appendChild(scorePanel);

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

    const dequeue = async () => {
        if (!queue.length) {
            finish();
            return;
        }

        // ドライバを1つずつクリックして詳細モーダルを表示させる
        const element = queue.shift();
        element.click();

        // モーダルに表示された情報を取得していく
        const modal = await getElementByClassNameAsync('van-popup');
        if (modal) {
            // ちらつかないようにモーダルは透明にしておく
            modal.style.opacity = '0';

            const equipDetail = document.createElement('div');
            // equipDetail.style.border = '1px solid lightgray';
            equipDetail.style.backgroundColor = '#242424';
            equipDetail.style.borderRadius = '16px';
            equipDetail.style.width = 'calc(33% - 0.5em)';
            equipDetail.style.padding = '12px 24px';
            equipDetail.style.margin = '0.25em';
            customEquipPanel.appendChild(equipDetail);


            // 名称やレベル、ドライバ画像等の基本情報   
            const content = modal.getElementsByClassName('popup-content')?.item(0);
            if (content) {
                const baseInfo = content.getElementsByTagName('div')?.item(0)?.cloneNode(true);
                if (baseInfo) {
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

                        calcScore(name, value);
                    }
                }

                equipDetail.appendChild(statusPanel);
                customEquipPanel.appendChild(equipDetail)
            }
            modal.style.opacity = 'unset';
        }

        dequeue();
    }


    // 処理実行
    equipElements.forEach(e => queue.push(e))
    dequeue();
})()
