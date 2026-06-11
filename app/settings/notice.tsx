import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const NOTION_URL = 'https://shaded-august-b75.notion.site/RUTINA-37b9ea65b6c380709065deeccabc3222?source=copy_link'; // 1단계에서 복사한 링크


export default function NoticeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{
          uri: NOTION_URL,
          headers: {
            'Accept-Charset': 'utf-8',
          },
        }}
        style={styles.webview}

        // 🔥 [필수] 노션의 복잡한 스크립트와 스타일을 실행하기 위한 옵션
        javaScriptEnabled
        domStorageEnabled

        // 📱 [필수] 모바일 화면에 맞게 폰트와 레이아웃을 자동 조절
        scalesPageToFit={true}

        // 🤖 [선택] 노션 서버에게 "나 최신 크롬 브라우저야"라고 속이는 유저 에이전트
        userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"

        // 2️⃣ [중요] 안드로이드에서 한글(UTF-8) 인코딩 강제 지정
        textEncodingName="utf-8"
        injectedJavaScript={`
                            const style = document.createElement('style');
                            style.innerHTML = '* { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }';
                            document.head.appendChild(style);
                            true;
                          `}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
