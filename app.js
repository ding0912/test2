// app.js
import { defaultDataset } from './questions.js';
import { DEFAULT_BG_URL, applyGlobalBackground, applySakuraBackground } from './bg-config.js';
import { parseEmotes } from './emotemap.js';
import { SoundController } from './audio-controller.js';

class QuizApp {
    constructor() {
        this.questions = [...defaultDataset];
        this.currentIndex = 0;
        this.score = 0;
        this.soundCtrl = new SoundController();
        this.editingIndex = -1;
        this.autoAdvanceTimer = null; // 紀錄答對/答錯彈窗倒數計時器
        this.creditsCountdownTimer = null; // 紀錄結尾頁面 10 秒倒數計時器
        this.countdownSeconds = 10;
        this.cropper = null;
        this.currentCropCallback = null;
        this.init();
    }

    // 開啟圖片裁切視窗
    openCropModal(file, aspectRatio = 16 / 9, callback) {
        if (typeof Cropper === 'undefined') {
            console.warn('Cropper.js 未載入，將跳過裁切步驟。');
            const reader = new FileReader();
            reader.onload = (e) => callback(e.target.result);
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const cropImg = document.getElementById('crop-target-img');
            if (!cropImg) return;
            cropImg.src = e.target.result;

            const cropModal = document.getElementById('crop-modal');
            cropModal?.classList.remove('hidden');

            // 如果已有舊的 cropper 實例先銷毀
            if (this.cropper) {
                this.cropper.destroy();
            }

            // 初始化 Cropper.js
            this.cropper = new Cropper(cropImg, {
                aspectRatio: aspectRatio, // 比例，例如 16/9 長方形
                viewMode: 1,
                autoCropArea: 0.9,
                background: false,
            });

            this.currentCropCallback = callback;
        };
        reader.readAsDataURL(file);
    }

    // 綁定裁切彈窗的按鈕事件 (已加回 init 中呼叫)
    initCropEvents() {
        const btnConfirm = document.getElementById('btn-confirm-crop');
        const btnCancel = document.getElementById('btn-cancel-crop');
        const cropModal = document.getElementById('crop-modal');

        if (btnConfirm) {
            btnConfirm.addEventListener('click', () => {
                if (!this.cropper) return;

                // 取得裁切後的 Canvas 並轉為 Base64 圖片
                const canvas = this.cropper.getCroppedCanvas({
                    width: 800,  // 設定輸出寬度
                    height: 450, // 設定輸出高度
                });

                const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

                if (this.currentCropCallback) {
                    this.currentCropCallback(croppedDataUrl);
                }

                cropModal?.classList.add('hidden');
                this.cropper.destroy();
                this.cropper = null;
            });
        }

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                cropModal?.classList.add('hidden');
                if (this.cropper) {
                    this.cropper.destroy();
                    this.cropper = null;
                }
            });
        }
    }

    // 處理本地圖片上傳與即時預覽
    handleImageUpload(event, targetInputId, targetPreviewImgId) {
        const file = event.target.files[0];
        if (!file) return;

        // 觸發裁切視窗，傳入 16:9 長方形比例
        this.openCropModal(file, 16 / 9, (croppedDataUrl) => {
            // 當使用者按下「確定裁切」後執行這裡
            const targetInput = document.getElementById(targetInputId);
            if (targetInput) {
                targetInput.value = croppedDataUrl;
            }

            const targetPreview = document.getElementById(targetPreviewImgId);
            if (targetPreview) {
                targetPreview.src = croppedDataUrl;
            }

            if (targetPreviewImgId === 'edit-q-pic-preview') {
                document.getElementById('edit-q-pic-preview-box')?.classList.remove('hidden');
            }
        });

        // 清空 input 讓重複選擇同檔名時也能觸發 change
        event.target.value = '';
    }

    init() {
        applyGlobalBackground(DEFAULT_BG_URL);
        this.initCropEvents(); // 加入裁切事件初始化
        this.bindEvents();
        if (window.lucide) {
            lucide.createIcons();
        }
        this.renderEditorQuestionsList();
    }

    bindEvents() {
        // 題目圖片上傳監聽 (Modal 內)
        const editQPicFile = document.getElementById('edit-q-pic-file');
        if (editQPicFile) {
            editQPicFile.addEventListener('change', (e) => this.handleImageUpload(e, 'edit-q-pic-url', 'edit-q-pic-preview'));
        }

        // 答對圖片上傳監聽
        const editQImageFile = document.getElementById('edit-q-image-file');
        if (editQImageFile) {
            editQImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // 傳入 NaN 取消 16:9 比例限制，允許自由拉伸形狀
                this.openCropModal(file, NaN, (croppedDataUrl) => {
                    const targetInput = document.getElementById('edit-q-image-url');
                    if (targetInput) targetInput.value = croppedDataUrl;

                    const targetPreview = document.getElementById('edit-q-img-preview');
                    if (targetPreview) targetPreview.src = croppedDataUrl;
                });
                e.target.value = '';
            });
        }

        // 答錯圖片上傳監聽
        const editQWrongImageFile = document.getElementById('edit-q-wrong-image-file');
        if (editQWrongImageFile) {
            editQWrongImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // 傳入 NaN 取消 16:9 比例限制
                this.openCropModal(file, NaN, (croppedDataUrl) => {
                    const targetInput = document.getElementById('edit-q-wrong-image-url');
                    if (targetInput) targetInput.value = croppedDataUrl;

                    const targetPreview = document.getElementById('edit-q-wrong-img-preview');
                    if (targetPreview) targetPreview.src = croppedDataUrl;
                });
                e.target.value = '';
            });
        }

        // 開始遊戲按鈕
        const btnStart = document.getElementById('btn-start-game');
        if (btnStart) {
            btnStart.addEventListener('click', () => this.startGame());
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => this.restartGame());
        }

        // 1. 點擊 Logo 解鎖編輯器按鈕
        let clickCount = 0;
        const devTrigger = document.getElementById('dev-logo-trigger');
        const btnEditorToggle = document.getElementById('btn-editor-toggle');

        if (devTrigger && btnEditorToggle) {
            devTrigger.addEventListener('click', () => {
                clickCount++;
                if (clickCount >= 3) {
                    btnEditorToggle.classList.remove('hidden');
                    alert('已解鎖自訂題目與編輯器功能！');
                    clickCount = 0;
                }
            });
        }

        // 2. 點擊「自訂題目」按鈕開啟編輯器 View
        if (btnEditorToggle) {
            btnEditorToggle.addEventListener('click', () => {
                document.getElementById('editor-view')?.classList.remove('hidden');
                this.renderEditorQuestionsList();
            });
        }

        // 3. 點擊編輯器右上角「X」關閉編輯器
        const btnCloseEditor = document.getElementById('btn-close-editor');
        if (btnCloseEditor) {
            btnCloseEditor.addEventListener('click', () => {
                document.getElementById('editor-view')?.classList.add('hidden');
            });
        }

        // 4. 點擊編輯器底部的「保存並開始遊戲」按鈕
        const btnSaveAndPlay = document.getElementById('btn-save-and-play');
        if (btnSaveAndPlay) {
            btnSaveAndPlay.addEventListener('click', () => {
                document.getElementById('editor-view')?.classList.add('hidden');
                this.startGame();
            });
        }

        // 5. 點擊「提前觀看紀念背景」按鈕
        const btnShowSakuraNow = document.getElementById('btn-show-sakura-now');
        if (btnShowSakuraNow) {
            btnShowSakuraNow.addEventListener('click', () => this.showSakuraScene());
        }

        // 6. 點擊紀念背景圖片關閉紀念畫面並重置遊戲
        const sakuraImgFrame = document.getElementById('sakura-img-frame');
        if (sakuraImgFrame) {
            sakuraImgFrame.addEventListener('click', () => {
                document.getElementById('sakura-view')?.classList.add('hidden');
                this.restartGame();
            });
        }

        // 編輯器 Tab 切換
        this.bindTabEvents();

        // 音效控制項事件監聽
        this.bindSoundEvents();

        // 題目編輯 Modal 按鈕
        const btnAddNewQ = document.getElementById('btn-add-new-q');
        if (btnAddNewQ) {
            btnAddNewQ.addEventListener('click', () => this.openEditModal(-1));
        }

        const btnSaveQEdit = document.getElementById('btn-save-q-edit');
        if (btnSaveQEdit) {
            btnSaveQEdit.addEventListener('click', () => this.saveQuestionEdit());
        }

        const btnCancelQEdit = document.getElementById('btn-cancel-q-edit');
        if (btnCancelQEdit) {
            btnCancelQEdit.addEventListener('click', () => {
                document.getElementById('edit-item-modal')?.classList.add('hidden');
            });
        }
    }

    bindTabEvents() {
        const tabs = [
            { btnId: 'tab-questions', panelId: 'panel-questions' },
            { btnId: 'tab-sounds', panelId: 'panel-sounds' },
            { btnId: 'tab-bg', panelId: 'panel-bg' }
        ];

        tabs.forEach(tab => {
            const btn = document.getElementById(tab.btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    tabs.forEach(t => {
                        document.getElementById(t.panelId)?.classList.add('hidden');
                        document.getElementById(t.btnId)?.classList.remove('text-purple-400', 'border-purple-400');
                        document.getElementById(t.btnId)?.classList.add('text-slate-400', 'border-transparent');
                    });
                    document.getElementById(tab.panelId)?.classList.remove('hidden');
                    btn.classList.remove('text-slate-400', 'border-transparent');
                    btn.classList.add('text-purple-400', 'border-purple-400');
                });
            }
        });
    }

    bindSoundEvents() {
        // 切換內建風格
        const selectSoundTheme = document.getElementById('select-sound-theme');
        if (selectSoundTheme) {
            selectSoundTheme.addEventListener('change', (e) => {
                this.soundCtrl.setTheme(e.target.value);
            });
        }

        // 上傳答對音效
        const fileSoundCorrect = document.getElementById('file-sound-correct');
        if (fileSoundCorrect) {
            fileSoundCorrect.addEventListener('change', (e) => this.handleAudioUpload(e, 'correct'));
        }

        // 上傳答錯音效
        const fileSoundWrong = document.getElementById('file-sound-wrong');
        if (fileSoundWrong) {
            fileSoundWrong.addEventListener('change', (e) => this.handleAudioUpload(e, 'wrong'));
        }

        // 上傳 BGM
        const fileSoundBgm = document.getElementById('file-sound-bgm');
        if (fileSoundBgm) {
            fileSoundBgm.addEventListener('change', (e) => this.handleAudioUpload(e, 'bgm'));
        }

        // BGM 音量調整
        const inputBgmVolume = document.getElementById('input-bgm-volume');
        if (inputBgmVolume) {
            inputBgmVolume.addEventListener('input', (e) => {
                const vol = e.target.value;
                this.soundCtrl.setBgmVolume(vol);
                const volText = document.getElementById('bgm-volume-val');
                if (volText) volText.textContent = `${Math.round(vol * 100)}%`;
            });
        }
    }

    handleAudioUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.soundCtrl.setCustomAudio(type, dataUrl);

            const clearBtn = document.getElementById(`btn-clear-sound-${type}`);
            if (clearBtn) clearBtn.classList.remove('hidden');

            alert(`${type === 'correct' ? '答對' : type === 'wrong' ? '答錯' : 'BGM'} 音效上傳成功！`);
        };
        reader.readAsDataURL(file);
    }

    openEditModal(index = -1) {
        this.editingIndex = index;
        const modal = document.getElementById('edit-item-modal');
        const modalTitle = document.getElementById('edit-modal-title');

        if (index === -1) {
            if (modalTitle) modalTitle.textContent = "新增題目與祝福設定";
            document.getElementById('edit-q-title').value = "";
            document.getElementById('edit-q-date').value = "";
            document.getElementById('edit-q-blessing').value = "";
            document.getElementById('edit-q-message').value = "";
            document.getElementById('edit-q-image-url').value = "";
            document.getElementById('edit-q-wrong-image-url').value = "";
            this.renderOptionInputs(["", "", ""], 0);
        } else {
            const q = this.questions[index];
            if (modalTitle) modalTitle.textContent = "編輯題目與祝福設定";
            document.getElementById('edit-q-title').value = q.question || "";
            document.getElementById('edit-q-date').value = q.eventDate || "";
            document.getElementById('edit-q-blessing').value = q.blessingText || "";
            document.getElementById('edit-q-message').value = q.customMessage || "";
            document.getElementById('edit-q-image-url').value = q.imageUrl || "";
            document.getElementById('edit-q-wrong-image-url').value = q.wrongImageUrl || "";
            this.renderOptionInputs(q.options || ["", "", ""], q.correctIndex || 0);
        }

        modal?.classList.remove('hidden');
    }

    renderOptionInputs(options, correctIdx) {
        const container = document.getElementById('edit-options-list');
        if (!container) return;

        container.innerHTML = options.map((opt, i) => `
            <div class="flex items-center gap-2">
                <input type="radio" name="correct-opt-radio" value="${i}" ${i === correctIdx ? 'checked' : ''} class="accent-purple-500">
                <input type="text" class="opt-input-field w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500" placeholder="選項 ${i + 1}" value="${opt}">
            </div>
        `).join('');
    }

    saveQuestionEdit() {
        const title = document.getElementById('edit-q-title').value.trim();
        const date = document.getElementById('edit-q-date').value.trim();
        const blessing = document.getElementById('edit-q-blessing').value.trim();
        const message = document.getElementById('edit-q-message').value.trim();
        const imageUrl = document.getElementById('edit-q-image-url').value.trim();
        const wrongImageUrl = document.getElementById('edit-q-wrong-image-url').value.trim();

        const optionInputs = document.querySelectorAll('.opt-input-field');
        const options = Array.from(optionInputs).map(input => input.value.trim());
        const selectedRadio = document.querySelector('input[name="correct-opt-radio"]:checked');
        const correctIndex = selectedRadio ? parseInt(selectedRadio.value) : 0;

        if (!title) {
            alert('請輸入問題敘述！');
            return;
        }

        const newQuestionData = {
            id: this.editingIndex === -1 ? Date.now() : this.questions[this.editingIndex].id,
            question: title,
            eventDate: date || "特別紀念日",
            options: options,
            correctIndex: correctIndex,
            blessingText: blessing,
            customMessage: message,
            imageUrl: imageUrl,
            wrongImageUrl: wrongImageUrl
        };

        if (this.editingIndex === -1) {
            this.questions.push(newQuestionData);
        } else {
            this.questions[this.editingIndex] = newQuestionData;
        }

        document.getElementById('edit-item-modal')?.classList.add('hidden');
        this.renderEditorQuestionsList();
        alert(this.editingIndex === -1 ? '新增題目成功！' : '修改題目成功！');
    }

    renderEditorQuestionsList() {
        const listContainer = document.getElementById('editor-questions-list');
        if (!listContainer) return;

        if (this.questions.length === 0) {
            listContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">目前沒有任何題目，請點擊上方按鈕新增。</p>`;
            return;
        }

        listContainer.innerHTML = this.questions.map((q, idx) => `
            <div class="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs mb-2">
                <div class="truncate max-w-[200px] sm:max-w-[300px]">
                    <span class="text-purple-400 font-bold mr-1">#${idx + 1}</span>
                    <span class="text-slate-200 font-medium">${q.question}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.quizApp.openEditModal(${idx})" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg transition">編輯</button>
                    <button onclick="window.quizApp.deleteQuestion(${idx})" class="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-lg transition">刪除</button>
                </div>
            </div>
        `).join('');
    }

    deleteQuestion(index) {
        if (confirm(`確定要刪除第 ${index + 1} 題嗎？`)) {
            this.questions.splice(index, 1);
            this.renderEditorQuestionsList();
        }
    }

    startGame() {
        if (this.questions.length === 0) {
            alert('目前沒有題目，請先新增題目！');
            return;
        }
        this.currentIndex = 0;
        this.score = 0;
        document.getElementById('start-view')?.classList.add('hidden');
        document.getElementById('result-view')?.classList.add('hidden');
        document.getElementById('sakura-view')?.classList.add('hidden');
        document.getElementById('game-view')?.classList.remove('hidden');
        this.renderQuestion();
    }

    renderQuestion() {
        const currentQ = this.questions[this.currentIndex];
        if (!currentQ) return;

        document.getElementById('question-tag').textContent = `第 ${this.currentIndex + 1} 題`;
        document.getElementById('question-date-text').textContent = currentQ.eventDate || '特別紀念日';
        document.getElementById('question-title').innerHTML = parseEmotes(currentQ.question);

        const progressPct = ((this.currentIndex + 1) / this.questions.length) * 100;
        document.getElementById('progress-bar').style.width = `${progressPct}%`;
        document.getElementById('progress-text').textContent = `進度：${this.currentIndex + 1} / ${this.questions.length}`;

        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            currentQ.options.forEach((optText, idx) => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left p-4 rounded-2xl bg-slate-800/60 hover:bg-purple-600/30 border border-slate-700/80 transition flex items-center justify-between group";
                btn.innerHTML = `<span class="font-medium text-slate-200">${optText}</span>`;
                btn.addEventListener('click', () => this.handleAnswer(idx));
                optionsContainer.appendChild(btn);
            });
        }
    }

    handleAnswer(selectedIndex) {
        const currentQ = this.questions[this.currentIndex];
        const isCorrect = selectedIndex === currentQ.correctIndex;

        if (isCorrect) {
            this.score += 20;
            this.soundCtrl.playCorrectSound();
            if (typeof confetti === 'function') {
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
            }
        } else {
            this.soundCtrl.playWrongSound();
        }

        this.showAnswerModal(isCorrect, currentQ);
    }

    showAnswerModal(isCorrect, qData) {
        const modal = document.getElementById('quote-modal');
        const modalBlessingText = document.getElementById('modal-blessing-text');
        const modalBlessingImg = document.getElementById('modal-blessing-img');

        if (modalBlessingText) modalBlessingText.textContent = isCorrect ? qData.blessingText : qData.customMessage;
        if (modalBlessingImg) modalBlessingImg.src = isCorrect ? (qData.imageUrl || 'https://placehold.co/200x200/311042/amber?text=✨') : (qData.wrongImageUrl || 'https://placehold.co/200x200/311042/rose?text=❌');

        modal?.classList.remove('hidden');

        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }

        const handleModalClick = () => {
            modal?.removeEventListener('click', handleModalClick);
            if (this.autoAdvanceTimer) {
                clearTimeout(this.autoAdvanceTimer);
                this.autoAdvanceTimer = null;
            }
            modal?.classList.add('hidden');
            this.nextQuestion();
        };

        modal?.addEventListener('click', handleModalClick);

        this.autoAdvanceTimer = setTimeout(() => {
            modal?.removeEventListener('click', handleModalClick);
            modal?.classList.add('hidden');
            this.nextQuestion();
        }, 7000);
    }

    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex < this.questions.length) {
            this.renderQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        document.getElementById('game-view')?.classList.add('hidden');
        document.getElementById('result-view')?.classList.remove('hidden');

        // 動態渲染感謝人員名單
        this.renderCreditsGrid();

        // 啟動 10 秒自動轉換特別畫面的倒數計時
        this.startCreditsCountdown();
    }

    startCreditsCountdown() {
        if (this.creditsCountdownTimer) {
            clearInterval(this.creditsCountdownTimer);
        }

        this.countdownSeconds = 10;
        const countdownText = document.getElementById('credits-countdown-text');

        this.creditsCountdownTimer = setInterval(() => {
            this.countdownSeconds--;
            if (countdownText) {
                countdownText.textContent = `( ${this.countdownSeconds} 秒後自動轉換特別畫面... )`;
            }

            if (this.countdownSeconds <= 0) {
                clearInterval(this.creditsCountdownTimer);
                this.creditsCountdownTimer = null;
                this.showSakuraScene();
            }
        }, 1000);
    }

    showSakuraScene() {
        if (this.creditsCountdownTimer) {
            clearInterval(this.creditsCountdownTimer);
            this.creditsCountdownTimer = null;
        }

        // ⬇️ 加入這行，切換至最後畫面時套用 DEFAULT_SAKURA_BG_URL (即 present.jpg)
        applySakuraBackground();

        document.getElementById('result-view')?.classList.add('hidden');
        document.getElementById('sakura-view')?.classList.remove('hidden');
    }

    renderCreditsGrid() {
        const creditsContainer = document.getElementById('movie-credits-grid');
        if (!creditsContainer) return;

        const creditsList = Array.from(
            new Set(
                this.questions
                    .map(q => q.options && q.options[q.correctIndex])
                    .filter(name => name && name.trim() !== '')
            )
        );

        if (creditsList.length === 0) {
            creditsContainer.innerHTML = `<p class="col-span-2 text-center text-xs text-slate-400">目前尚無感謝名單</p>`;
            return;
        }

        creditsContainer.innerHTML = creditsList.map((name, idx) => `
            <div class="flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-xl border border-amber-500/20 shadow-sm">
                <i data-lucide="heart" class="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0"></i>
                <span class="text-xs text-amber-100 font-bold truncate">${name}</span>
            </div>
        `).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    restartGame() {
        if (this.creditsCountdownTimer) {
            clearInterval(this.creditsCountdownTimer);
            this.creditsCountdownTimer = null;
        }
        document.getElementById('result-view')?.classList.add('hidden');
        document.getElementById('sakura-view')?.classList.add('hidden');
        this.startGame();
    }
}

// 頁面載入後初始化，並註冊 HTML 行內相容的全域函式
window.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});

window.previewAudio = function (type) {
    if (!window.quizApp) return;
    if (type === 'correct') {
        window.quizApp.soundCtrl.playCorrectSound();
    } else if (type === 'wrong') {
        window.quizApp.soundCtrl.playWrongSound();
    } else if (type === 'bgm') {
        window.quizApp.soundCtrl.toggleBgmPreview();
    }
};

window.clearCustomAudio = function (type) {
    if (!window.quizApp) return;
    window.quizApp.soundCtrl.clearCustomAudio(type);
    const clearBtn = document.getElementById(`btn-clear-sound-${type}`);
    if (clearBtn) clearBtn.classList.add('hidden');
    alert(`已清除自訂 ${type} 音效`);
};
