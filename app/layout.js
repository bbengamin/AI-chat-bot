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
            src="http://localhost:3000/js/widget.js"
            data-api-url="http://localhost:3000"
            data-assistant-id="asst_ahSW7jZk3aQbPLbV42ZhVOuM"
            strategy="afterInteractive"
            data-container-id="custom-chat-container"
        />
        </body>
        </html>
    );
}
