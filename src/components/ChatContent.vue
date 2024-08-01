<template>
    <el-container style="height: 100vh;">
        <!-- 채팅 영역 -->
        <el-container>
            <!-- header 색상 부여 -->
            <el-header class="bg-gradient-to-r text-black p-4">
                <!-- <h2 class="text-lg font-semibold">데모 시연</h2> -->
                <img src="@/assets/LH공사로고.png" alt="로고" class="h-12" />
            </el-header>

            <el-scrollbar ref="chatContainer" class="p-4 overflow-y-auto bg-white">
                <div class="flex flex-col items-center">
                    <!-- 대문 인사 -->
                    <div v-if="!hasStartedChat" class="flex mb-6 w-full max-w-4xl justify-start mt-20">
                        <div>
                            <h1 class="text-4xl font-bold mb-4">안녕하세요</h1>
                            <h2 class="text-2xl font-semibold mb-8">무엇을 도와드릴까요?</h2>
                        </div>
                    </div>
                    <div v-for="(message, index) in messages" :key="index" class="flex mb-6 mt-4  w-full max-w-4xl" :class="{'justify-start': message.isUser, 'justify-start': !message.isUser}">
                        <!-- 프로필 -->
                        <div v-if="message.isUser" class="flex-shrink-0 mr-4 mt-1">
                            <div class="w-8 h-8 rounded-full header-custom flex items-center justify-center text-white">
                                <el-icon><Avatar /></el-icon>
                            </div>
                        </div>
                        <div v-if="!message.isUser" class="flex-shrink-0 mr-4 mt-1">
                            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                <el-icon><ChatDotSquare /></el-icon>
                            </div>
                        </div>
                        <!-- 메세지 -->
                        <div>
                            <div :class="message.isUser ? 'bg-gray-100 text-black' : 'bg-white text-black'" class="rounded px-4 py-2 whitespace-pre-wrap" style="border-radius: 30px;" v-html="renderMarkdown(message.text)" animated="animated"></div>
                            <div class="text-xs text-gray-500 mt-1" :class="{'text-left': message.isUser, 'text-left': !message.isUser}">
                                {{ message.time }}
                            </div>
                            <div v-if="!message.isUser && message.results">
                                <el-divider></el-divider>
                                <div v-for="(result, i) in message.results" :key="i">
                                    <el-button round @click="showResult(result)">
                                        <el-icon style="padding-right: 3px;"><Paperclip /></el-icon>
                                        {{ result.document }}
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 로딩 애니메이션 -->
                    <div v-if="isLoading" class="w-full max-w-4xl flex justify-start mb-4">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <el-icon><ChatDotSquare /></el-icon>
                        </div>
                        <div class="loading-animation">
                            <div class="loading-bar"></div>
                            <div class="loading-bar-left"></div>
                            <div class="loading-bar-400"></div>
                        </div>
                    </div>
                </div>
            </el-scrollbar>

            <!-- 채팅창 -->
            <el-footer class="p-4 border-t-0 b bg-white flex justify-center items-center">
                <div class="flex items-center bg-white rounded-full px-4 py-2 w-full max-w-4xl mx-auto mb-8">
                    <el-input v-model="newMessage" :autosize="{ minRows: 1, maxRows: 4 }" placeholder="여기에 프롬프트 입력" class="rounded-textarea flex-1" @keyup.enter="sendMessage">
                        <template #append>
                            <el-button @click="sendMessage" size="large" round type="primary">
                                <el-icon><Position /></el-icon>
                            </el-button>
                        </template>
                    </el-input>
                </div>
            </el-footer>

            <!-- 검색 결과 모달 -->
            <el-dialog v-model="isModalVisible" width="50%">
                <template #title>검색 결과</template>
                <div v-if="modalResult" v-html="modalResult.content">
                </div>
                <template #footer>
                    <el-button @click="isModalVisible = false">Close</el-button>
                </template>
            </el-dialog>
        </el-container>
    </el-container>
</template>

<script>
import axios from 'axios';
import { marked } from 'marked';
function parseMarkdownWithTables(markdownText) {
    // 마크다운을 HTML로 변환
    let html = marked(markdownText);

    // 테이블 태그에 클래스를 추가
    // html = html.replace(/<table>/g, '<table class="custom-table">');

    return html;
}
marked.setOptions({ breaks: false });

export default {
    name: 'ChatComponent',
    data() {
        return {
            newMessage: '',
            messages: [],
            isLoading: false,
            isOpen: false,
            isModalVisible: false,
            modalResult: null,
            hasStartedChat: false,
        };
    },
    methods: {
        async sendMessage() {
            if (this.newMessage.trim() !== '') {
                this.hasStartedChat = true;
                this.messages.push({ text: this.newMessage, time: new Date().toLocaleTimeString(), isUser: true });
                const userMessage = this.newMessage;
                this.newMessage = '';
                this.scrollToBottom();
                this.isLoading = true;

                try {
                    const response = await axios.post('/chat', { message: userMessage });

                    // 응답 텍스트 배열을 받아서 하나씩 처리
                    const responseTexts = response.data.response;
                    let generatedText = '';
                    this.updateBotMessage(generatedText, false); // 최초로 빈 메시지 추가

                    for (const text of responseTexts) {
                        await this.delay(20); // 50ms 지연을 추가하여 타이핑 효과
                        generatedText += text;
                        this.isLoading = false;
                        this.updateBotMessage(generatedText, false); // 중간 텍스트 갱신
                    }

                    // 최종 텍스트 갱신 및 결과 추가
                    this.updateBotMessage(generatedText, true, response.data.results);
                    this.scrollToBottom();
                } catch (error) {
                    console.error('Error sending message:', error);
                    this.$message.error('Error sending message');
                } finally {
                    this.isLoading = false;
                }
            }
        },
        updateBotMessage(text, isFinal, results = []) {
            if (!this.messages.length || this.messages[this.messages.length - 1].isUser) {
                this.messages.push({ text, time: new Date().toLocaleTimeString(), isUser: false, results: isFinal ? this.formatResults(results) : [] });
            } else {
                const lastMessage = this.messages[this.messages.length - 1];
                lastMessage.text = text;
                if (isFinal) {
                    lastMessage.results = this.formatResults(results);
                }
            }
            this.scrollToBottom();
        },
        formatResults(results) {
            if (!results) return [];
            const mergedResults = [];
            results.forEach(result => {
                const cleanedDocument = result.document.replace('.pdf', ''); // .pdf 부분 제거
                const existingResult = mergedResults.find(r => r.document === cleanedDocument);
                if (existingResult) {
                    existingResult.content += `<br><br><hr><br> ${result.content}`;
                } else {
                    mergedResults.push({ content: result.content, document: cleanedDocument });
                }
            });
            return mergedResults.map(result => ({
                document: result.document,
                content: `<strong>[문서명]</strong><br>${result.document}<br><strong>[참고내용]</strong><br>${result.content.replace(/\n/g, '<br>')}`
            }));
        },
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        scrollToBottom() {
            this.$nextTick(() => {
                const chatContainer = this.$refs.chatContainer.$el.querySelector('.el-scrollbar__wrap');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        },
        renderMarkdown(text) {
            if (text.includes('|')) {
                //const cleanedText = text.replace(/\n/g, '\\n');
                return this.cleanHtml(parseMarkdownWithTables(text));
            } else {
                return text;
            }
        },
        cleanHtml(html) {
            return html.replace(/<\/?p>/g, '');
        },
        showResult(result) {
            this.modalResult = result;
            this.isModalVisible = true;
        },
        toggleAccordion() {
            this.isOpen = !this.isOpen;
        },
    },
    updated() {
        this.scrollToBottom();
    },
};
</script>
<style>
.el-header {
    display: flex;
    align-items: center;
}
.el-menu-item {
    padding: 15px 20px;
}
.el-menu-item:hover {
    background-color: #3a3f44 !important;
}
.el-button,
.el-input {
    margin-top: 10px;
}
.chat-view {
    display: flex;
    flex-direction: column;
}
.header-custom {
    background-color: #a6f300;
}
.rounded-textarea .el-textarea__inner {
    border-radius: 50px !important;
    border: 1px solid #e5e5e5 !important;
    padding: 10px !important;
    background-color: #f5f5f5 !important;
    box-shadow: none !important;
    outline: none !important;
}
.loading-animation {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    margin-left: 15px;
}
.loading-bar {
    background: linear-gradient(to right, #4da4fb, #4da4fb 50%, #a8c9fa 50%, #a8c9fa);
    background-size: 200% 100%;
    height: 10px;
    border-radius: 5px;
    animation: loading 2.5s ease-in-out infinite;
}
.loading-bar-400 {
    background: linear-gradient(to right, #4da4fb, #4da4fb 50%, #a8c9fa 50%, #a8c9fa);
    background-size: 200% 100%;
    height: 10px;
    width: 400px;
    border-radius: 5px;
    animation: loading 2.5s ease-in-out infinite;
}
.loading-bar-left {
    background: linear-gradient(to left, #4da4fb, #4da4fb 50%, #a8c9fa 50%, #a8c9fa);
    background-size: 200% 100%;
    height: 10px;
    border-radius: 5px;
    animation: loading 2.5s ease-in-out infinite;
}
.markdown-content p {
    margin-bottom: 0;
    margin: 6px;
}

.custom-table {
    border-collapse: collapse; 
    text-align: right;
    line-height: 1.5;
    width: 100%;
    border: 1px solid #3f87e0;
    border-spacing: 0;
}
table {             
    width: 100%;             
    border-collapse: collapse;  
    margin-top: 10px;      
    table-layout: auto;
}  
th {             
    border: 1px solid #ddd;             
    padding: 8px; 
    padding-top: 10px;
/* Prevents wrapping of cell content */
}      
td {             
    border: 1px solid #ddd;             
    padding: 8px; 
/* Prevents wrapping of cell content */
}
@keyframes loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}
</style>
