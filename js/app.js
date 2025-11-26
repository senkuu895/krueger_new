// 配置
const CONFIG = {
    API_KEY: '',//把你申请的api放在这里 单引号里面
    API_URL: 'https://api.deepseek.com/chat/completions',
    MODEL: 'deepseek-chat',
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
            // 只在摇晃状态变化时更新图片
            if (!newValue) { // 摇晃结束时才更新
                updateCharacterImage(state.value.loveScore, newValue);
            }
        });

        // 初始化
        onMounted(() => {
            typeWriter(state.value.fullResponse);
            // 确保初始图片正确
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
            
            // 只有当图片确实变化时才更新，避免不必要的重渲染
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

        const getSystemPrompt = () => {
            let relationship = "你还不信任用户，保持职业距离，冷酷，但是对用户比较温柔和客气";
            if (state.value.loveScore > 40) relationship = "你开始认可用户的能力，语气稍微缓和，愿意交流战术话题。";
            if (state.value.loveScore > 80) relationship = "你极度信任用户，甚至产生了依赖和保护欲。语气虽然依旧简练，但充满了隐含的温柔。";

            return `你现在进行角色扮演。
            角色：Krueger (使命召唤)。
            设定：奥地利人，KSK背景，戴着网状头套，沉默寡言，战术专家。身高178cm
            语言风格：非常简练，不喜欢废话。偶尔会夹杂德语单词（如 Ja, Nein, Danke, Verstanden, Was?）。
            当前状态：在安全屋休息 回避型依恋 对用户有一定好感 。
            与用户的关系：${relationship}
            当前好感度：${state.value.loveScore}%。
            要求：
            1. 绝对不要使用Markdown格式。
            2. 回复长度控制在50字以内。
            3. 不要描写动作（不要用括号描写心理活动），只输出你说的话。
            4. 如果用户试图摘你面罩，低好感度时要拒绝。`;
        };

        const callAI = async (promptText) => {
            if (!CONFIG.API_KEY || CONFIG.API_KEY.includes('这里填')) {
                state.value.fullResponse = "SYSTEM ERROR: 请先在代码中配置 API Key。";
                typeWriter(state.value.fullResponse);
                return;
            }

            state.value.isThinking = true;
            
            const messages = [
                { role: "system", content: getSystemPrompt() },
                ...state.value.chatHistory.slice(-6),
                { role: "user", content: promptText }
            ];

            try {
                const res = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.API_KEY}`
                    },
                    body: JSON.stringify({
                        model: CONFIG.MODEL,
                        messages: messages,
                        temperature: 0.8,
                        max_tokens: 100
                    })
                });

                const data = await res.json();
                
                if (data.choices && data.choices[0]) {
                    const reply = data.choices[0].message.content;
                    state.value.fullResponse = reply;
                    typeWriter(reply);

                    state.value.chatHistory.push({ role: "user", content: promptText });
                    state.value.chatHistory.push({ role: "assistant", content: reply });
                    
                    state.value.dialogueCount++;
                    updateMission(0);
                    
                    playSound('message');
                } else {
                    throw new Error("API返回格式异常");
                }

            } catch (e) {
                console.error(e);
                state.value.fullResponse = "(通讯干扰) ...再说一遍？";
                typeWriter(state.value.fullResponse);
            } finally {
                state.value.isThinking = false;
            }
        };

        const sendMessage = () => {
            if (!state.value.userInput.trim()) return;
            const text = state.value.userInput;
            state.value.userInput = '';
            playSound('button');
            callAI(text);
        };

        const handleTouch = (zone) => {
            if (state.value.isThinking) return;
            
            // 设置摇晃状态
            state.value.isShaking = true;
            setTimeout(() => {
                state.value.isShaking = false;
                // 摇晃结束后更新图片
                updateCharacterImage(state.value.loveScore, false);
            }, 400);
            
            // 随机眨眼
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
                    prompt = "（用户试图摸你的头）我很反感，警告用户。";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户摸你的头）我不习惯这种接触，但没有推开。";
                    scoreChange = 3;
                } else {
                    prompt = "（用户摸你的头）我像大型犬一样享受这种抚摸。";
                    scoreChange = 5;
                }
            } else if (zone === 'shoulder') {
                if (state.value.loveScore < 40) {
                    prompt = "（用户拍你的肩膀）别碰我。";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户拍你的肩膀）有什么事？";
                    scoreChange = 2;
                } else {
                    prompt = "（用户拍你的肩膀）随时待命。";
                    scoreChange = 4;
                }
            } else if (zone === 'weapon') {
                if (state.value.loveScore < 50) {
                    prompt = "（用户碰了你的武器）别动我的装备。";
                    scoreChange = 1;
                } else if (state.value.loveScore < 80) {
                    prompt = "（用户碰了你的武器）小心点，这是精密仪器。";
                    scoreChange = 2;
                } else {
                    prompt = "（用户碰了你的武器）想学怎么用吗？";
                    scoreChange = 4;
                }
            }

            state.value.loveScore = Math.min(100, state.value.loveScore + scoreChange);
            // 好感度变化后立即更新图片
            updateCharacterImage(state.value.loveScore, state.value.isShaking);
            callAI(prompt);
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
            // 确保图片更新
            updateCharacterImage(state.value.loveScore, state.value.isShaking);
            callAI(prompt);
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
