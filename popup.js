document.addEventListener('DOMContentLoaded', () => {
    const switchElement = document.getElementById('switch');

    // ストレージからスイッチの状態を読み込む
    chrome.storage.sync.get('switchState', (data) => {
        switchElement.checked = data.switchState || false;
    });

    // スイッチの状態が変わったときにストレージに保存する
    switchElement.addEventListener('change', () => {
        chrome.storage.sync.set({ switchState: switchElement.checked }, () => {
            console.log('Switch state saved:', switchElement.checked);
        });
    });

    document.getElementById('start').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('tabs', tabs)
            if (tabs.length > 0) {
                console.log('Active tab ID:', tabs[0].id);
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        console.error('Script injection failed:', chrome.runtime.lastError);
                    } else {
                        console.log('Content script injected:', results);
                    }
                });
            } else {
                console.error('No active tab found');
            }
        });
    });
});
