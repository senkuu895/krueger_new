// 配置
const CONFIG = {
    IMAGES: {
        idle: 'images/krueger_idle.png',
        shy: 'images/krueger_blush.png',
        angry: 'images/krueger_idle.png' // 临时用 idle 替代
    },
    MISSIONS: [
        { text: "与Krueger对话3次", completed: false, progress: 0, target: 3 },
        { text: "触摸互动5次", completed: false, progress: 0, target: 5 },
        { text: "赠送礼物", completed: false, progress: 0, target: 1 },
        { text: "清洁武器", completed: false, progress: 0, target: 1 },
        { text: "完成战术训练", completed: false, progress: 0, target: 1 }
    ]
};

// 游戏状态管理
const gameState = {
    loveScore: 15,
    userInput: '',
    fullResponse: '...我们在安全屋。周围没有敌对目标。',
    displayBuffer: '',
    isThinking: false,
    isShaking: false,
    isBlinking: false,
    showMissions: false,
    audioEnabled: true,
    missions: JSON.parse(JSON.stringify(CONFIG.MISSIONS)),
    effects: [],
    notification: { show: false, text: '', type: 'success' },
    chatHistory: [],
    touchCount: 0,
    dialogueCount: 0,
    currentImage: CONFIG.IMAGES.idle // 初始使用 idle 图片
};

// Vue应用
const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
    setup() {
        // 响应式状态
        const state = ref({...gameState});

        // 计算属性
        const statusText = computed(() => {
            if (state.value.loveScore < 30) return "警戒";
            if (state.value.loveScore < 70) return "待命";
            return "依赖";
        });
        
        const completedMissions = computed(() => {
            return state.value.missions.filter(m => m.completed).length;
        });

        // 监听器 - 修复图片更新逻辑
        watch(() => state.value.loveScore, (newValue) => {
            updateCharacterImage(newValue, state.value.isShaking);
        });
        
        watch(() => state.value.isShaking, (newValue) => {
            if (!newValue) { 
                updateCharacterImage(state.value.loveScore, newValue);
            }
        });

        // 初始化
        onMounted(() => {
            typeWriter(state.value.fullResponse);
            updateCharacterImage(state.value.loveScore, state.value.isShaking);
        });

        // 方法 - 修复图片更新逻辑
        const updateCharacterImage = (loveScore, isShaking) => {
            let newImage = CONFIG.IMAGES.idle;
            
            if (loveScore < 20) {
                newImage = CONFIG.IMAGES.angry;
            } else if (loveScore >= 90) {
                newImage = CONFIG.IMAGES.shy;
            } else if (isShaking && loveScore > 20) {
                newImage = CONFIG.IMAGES.shy;
            }
            
            if (state.value.currentImage !== newImage) {
                state.value.currentImage = newImage;
            }
        };

        const typeWriter = (text) => {
            state.value.displayBuffer = '';
            let i = 0;
            const speed = 30;
            const type = () => {
                if (i < text.length) {
                    state.value.displayBuffer += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                }
            };
            type();
        };

        const showNotification = (text, type = 'success') => {
            state.value.notification = { show: true, text, type };
            setTimeout(() => {
                state.value.notification.show = false;
            }, 3000);
        };

        const addEffect = (type, x, y) => {
            state.value.effects.push({ type, x, y });
            setTimeout(() => {
                state.value.effects.shift();
            }, 1500);
        };

        const updateMission = (index, increment = 1) => {
            const mission = state.value.missions[index];
            if (mission.completed) return;
            
            mission.progress += increment;
            if (mission.progress >= mission.target) {
                mission.completed = true;
                state.value.loveScore = Math.min(100, state.value.loveScore + 10);
                showNotification(`任务完成: ${mission.text}`, 'success');
            }
        };

        const toggleAudio = () => {
            state.value.audioEnabled = !state.value.audioEnabled;
        };
        
        const playSound = (type) => {
            if (!state.value.audioEnabled) return;
            
            try {
                const audio = new Audio();
                
                if (type === 'touch') {
                    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
                } else if (type === 'button') {
                    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
                } else if (type === 'message') {
                    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
                }
                
                audio.volume = 0.3;
                audio.play();
            } catch (e) {
                console.log("音效播放失败:", e);
            }
        };

        // 替换AI为固定回复（纯静态核心修改）
        const getStaticReply = (promptText, loveScore) => {
            // 触摸互动的回复
            if (promptText.includes("摸你的头")) {
                if (loveScore < 30) return "保持距离，别碰我。";
                if (loveScore < 80) return "Ja...别随便碰我的头套。";
                return "Danke，搭档。";
            }
            if (promptText.includes("拍你的肩膀")) {
                if (loveScore < 40) return "别碰我。";
                if (loveScore < 80) return "有什么指示？";
                return "随时待命。";
            }
            if (promptText.includes("碰了你的武器")) {
                if (loveScore < 50) return "别动我的装备。";
                if (loveScore < 80) return "小心点，这是精密仪器。";
                return "想学怎么用吗？";
            }
            // 事件互动的回复
            if (promptText.includes("单兵口粮")) return "补给收到，很实用。感谢。";
            if (promptText.includes("擦拭武器")) return "武器保养很重要，谢了。";
            if (promptText.includes("战术训练")) return "Verstanden，训练现在开始。";
            // 用户输入指令的回复
            const randomReplies = [
                "收到指令，保持警惕。",
                "Was？再说一遍？",
                "Ja，按计划执行。",
                "安全屋周围无异常。"
            ];
            return randomReplies[Math.floor(Math.random() * randomReplies.length)];
        };

        // 替换原callAI为纯静态版本
        const callStaticReply = (promptText) => {
            state.value.isThinking = true;
            
            // 模拟思考延迟
            setTimeout(() => {
                const reply = getStaticReply(promptText, state.value.loveScore);
                state.value.fullResponse = reply;
                typeWriter(reply);

                state.value.chatHistory.push({ role: "user", content: promptText });
                state.value.chatHistory.push({ role: "assistant", content: reply });
                
                state.value.dialogueCount++;
                updateMission(0);
                
                playSound('message');
                state.value.isThinking = false;
            }, 1200);
        };

        const sendMessage = () => {
            if (!state.value.userInput.trim()) return;
            const text = state.value.userInput;
            state.value.userInput = '';
            playSound('button');
            callStaticReply(text);
        };

        const handleTouch = (zone) => {
            if (state.value.isThinking) return;
            
            state.value.isShaking = true;
            setTimeout(() => {
                state.value.isShaking = false;
                updateCharacterImage(state.value.loveScore, false);
            }, 400);
            
            if (Math.random() > 0.7) {
                state.value.isBlinking = true;
                setTimeout(() => state.value.isBlinking = false, 300);
            }

            addEffect('heart', Math.random() * 300 + 100, Math.random() * 300 + 200);
            playSound('touch');

            let prompt = "";
            let scoreChange = 0;
            
            state.value.touchCount++;
            updateMission(1);

            if (zone === 'head') {
                if (state.value.loveScore < 30) {
                    prompt = "（用户试图摸你的头）";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户摸你的头）";
                    scoreChange = 3;
                } else {
                    prompt = "（用户摸你的头）";
                    scoreChange = 5;
                }
            } else if (zone === 'shoulder') {
                if (state.value.loveScore < 40) {
                    prompt = "（用户拍你的肩膀）";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户拍你的肩膀）";
                    scoreChange = 2;
                } else {
                    prompt = "（用户拍你的肩膀）";
                    scoreChange = 4;
                }
            } else if (zone === 'weapon') {
                if (state.value.loveScore < 50) {
                    prompt = "（用户碰了你的武器）";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户碰了你的武器）";
                    scoreChange = 2;
                } else {
                    prompt = "（用户碰了你的武器）";
                    scoreChange = 4;
                }
            }

            state.value.loveScore = Math.min(100, state.value.loveScore + scoreChange);
            updateCharacterImage(state.value.loveScore, state.value.isShaking);
            callStaticReply(prompt);
        };

        const triggerEvent = (type) => {
            if (state.value.isThinking) return;
            let prompt = "";
            let scoreChange = 0;
            
            playSound('button');
            
            if (type === 'gift') {
                prompt = "（用户送给你一份单兵口粮和新的弹药）";
                scoreChange = 8;
                updateMission(2);
            } else if (type === 'clean') {
                prompt = "（用户帮你擦拭武器）";
                scoreChange = 5;
                updateMission(3);
            } else if (type === 'train') {
                prompt = "（用户邀请你进行战术训练）";
                scoreChange = 7;
                updateMission(4);
            }
            
            state.value.loveScore = Math.min(100, state.value.loveScore + scoreChange);
            updateCharacterImage(state.value.loveScore, state.value.isShaking);
            callStaticReply(prompt);
        };

        return {
            state,
            statusText,
            completedMissions,
            handleTouch,
            sendMessage,
            triggerEvent,
            toggleAudio
        };
    }
}).mount('#app');
