import {Montserrat} from 'next/font/google';
import './globals.css';
import MainComponent from "@/components/MainComponent";
import Script from 'next/script';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata = {
    title: 'myAssistant',
    description: 'Create your own GPT Assistant powered by OpenAI',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={`${montserrat.className}`}>
        <MainComponent children={children} />
        <Script
            src="https://helperbot-6d671b3ad96a.herokuapp.com/js/widget.js"
            data-api-url="https://helperbot-6d671b3ad96a.herokuapp.com"
            data-assistant-id="asst_ahSW7jZk3aQbPLbV42ZhVOuM"
            strategy="afterInteractive"
            data-container-id="custom-chat-container"
        />

        {/*Custom styles to override external widget*/}
        <style>{`
                    #custom-chat-container {
                        height: 500px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important; 
                    }

                    @media (max-width: 1024px) {
                        #custom-chat-container {
                            height: 60vh !important;
                        }
                    }

                    @media (max-width: 640px) {
                        #custom-chat-container {
                            height: 40vh !important;
                        }
                    }
                    
                     #custom-chat-container .input-box {
                      display: flex;
                      align-items: center;
                      padding: 0.75rem;
                      border-top: 1px solid #ccc;
                      background: #fff;
                      gap: 0.5rem;
                    }

                    #custom-chat-container .input-box input[type="text"] {
                      flex: 1 1 auto;
                      min-width: 0;
                      padding: 0.5rem;
                      border-radius: 4px;
                      border: 1px solid #ccc;
                      font-size: 1rem;
                    }

                    #custom-chat-container .send-button {
                      background-color: #3b82f6;
                      color: #fff;
                      border: none;
                      padding: 0.5rem 1rem;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 1rem;
                    }
                    
                    @media (max-width: 1024px) {
                      #custom-chat-container .input-box input[type="text"] {
                        font-size: 0.95rem;
                        padding: 0.4rem;
                      }
                      #custom-chat-container .send-button {
                        font-size: 0.9rem;
                        padding: 0.4rem 0.8rem;
                      }
                      #custom-chat-container .clear-button-link {
                        padding: 0.3rem 0.6rem;
                      }
                    }

                    @media (max-width: 640px) {
                      #custom-chat-container .input-box {
                        flex-direction: column;
                        align-items: stretch;
                      }
                      #custom-chat-container .clear-button-link {
                        margin-right: 0;
                        margin-bottom: 0.4rem;
                        text-align: center;
                        width: 100%;
                      }
                      #custom-chat-container .input-box input[type="text"] {
                        font-size: 0.9rem;
                        width: 100%;
                      }
                      #custom-chat-container .send-button {
                        font-size: 0.9rem;
                        width: 100%;
                        text-align: center;
                      }
                    }
                    
                        #confirm-popup {
                          position: fixed;   
                          top: 0;
                          left: 0;
                          width: 100vw;
                          height: 100vh;
                          z-index: 99999; 
                        }
                    
                        #confirm-popup .confirm-popup-overlay {
                          position: absolute;
                          top: 0;
                          left: 0;
                          width: 100%;
                          height: 100%;
                          background-color: rgba(0, 0, 0, 0.4);
                          z-index: 99998; 
                        }

                       #confirm-popup .confirm-popup-content {
                          position: relative;
                          z-index: 99999; 
                          max-width: 400px;
                          padding: 1rem;
                          border-radius: 6px;
                        }
                `}</style>

        {/*Custom script to change text in element in external widget*/}
        <script
            dangerouslySetInnerHTML={{
                __html: `
              function repositionClearButton() {
                const clearBtn = document.querySelector('#custom-chat-container .chat-toolbar .clear-button-link');
                const inputBox = document.querySelector('#custom-chat-container .input-box');
                if (!clearBtn || !inputBox) return false;

                clearBtn.textContent = 'New Conversation';

                clearBtn.style.display = 'inline-block';
                clearBtn.style.marginRight = '1rem';

                inputBox.prepend(clearBtn);

                return true;
              }

              document.addEventListener('DOMContentLoaded', () => {
                let attempts = 0;
                const maxAttempts = 20;
                const interval = setInterval(() => {
                  const success = repositionClearButton();
                  if (success || attempts++ >= maxAttempts) {
                    clearInterval(interval);
                  }
                }, 500);
              });
            `,
            }}
        />
        </body>
        </html>
    );
}
