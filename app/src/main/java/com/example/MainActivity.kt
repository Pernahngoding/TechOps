package com.example

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        Surface(
          modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .testTag("app_main_surface"),
          color = MaterialTheme.colorScheme.background
        ) {
          SchoolWebAppScreen()
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SchoolWebAppScreen() {
  val context = LocalContext.current
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var externalUrl by remember { mutableStateOf<String?>(null) }
  var externalTitle by remember { mutableStateOf<String?>(null) }
  var externalWebViewInstance by remember { mutableStateOf<WebView?>(null) }

  // Handle hardware Back button: if external viewer is active, close it or go back
  BackHandler(enabled = externalUrl != null) {
    if (externalWebViewInstance?.canGoBack() == true) {
      externalWebViewInstance?.goBack()
    } else {
      externalUrl = null
      externalTitle = null
    }
  }

  // Handle hardware Back button for main app webview
  BackHandler(enabled = externalUrl == null && webViewInstance?.canGoBack() == true) {
    webViewInstance?.goBack()
  }

  Box(modifier = Modifier.fillMaxSize()) {
    // 1. MAIN TEACHOPS WEBVIEW
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .testTag("school_spa_webview"),
      factory = { ctx ->
        WebView(ctx).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )
          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          }
          addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun openExternal(url: String?) {
              if (!url.isNullOrBlank()) {
                try {
                  val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                  ctx.startActivity(intent)
                } catch (e: Exception) {
                  Log.e("TeachOpsWeb", "Failed to launch intent: ${e.message}")
                }
              }
            }

            @android.webkit.JavascriptInterface
            fun openExternalInApp(url: String?, title: String?) {
              if (!url.isNullOrBlank()) {
                (ctx as? Activity)?.runOnUiThread {
                  externalUrl = url
                  externalTitle = title ?: "Web Apps Eksternal"
                }
              }
            }
          }, "AndroidApp")

          webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
              Log.d("TeachOpsWeb", "${consoleMessage?.message()} [line ${consoleMessage?.lineNumber()}]")
              return true
            }
          }

          webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
              Log.w("TeachOpsWeb", "WebView onReceivedError: $description")
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
              val url = request?.url?.toString() ?: return false
              if (url.startsWith("http://") || url.startsWith("https://")) {
                // If it's an external link, open in-app with back button
                (ctx as? Activity)?.runOnUiThread {
                  externalUrl = url
                  externalTitle = if (url.contains("sipsarpras")) "SIPSarpras MTs SAHID" else if (url.contains("absensippms")) "Absensi PPMS MTs" else "Web Apps"
                }
                return true
              }
              return false
            }
          }

          loadUrl("file:///android_asset/index.html")
          webViewInstance = this
        }
      },
      update = { webView ->
        webViewInstance = webView
      }
    )

    // 2. IN-APP EXTERNAL WEBVIEW OVERLAY (WITH PROMINENT BACK BUTTON TO TEACHOPS)
    if (externalUrl != null) {
      Scaffold(
        modifier = Modifier
          .fillMaxSize()
          .testTag("external_app_container"),
        topBar = {
          TopAppBar(
            title = {
              Column {
                Text(
                  text = externalTitle ?: "Web Apps Eksternal",
                  style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 15.sp),
                  maxLines = 1
                )
                Text(
                  text = externalUrl ?: "",
                  style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                  maxLines = 1
                )
              }
            },
            navigationIcon = {
              IconButton(
                onClick = {
                  externalUrl = null
                  externalTitle = null
                },
                modifier = Modifier.testTag("btn_back_to_teachops")
              ) {
                Icon(
                  imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                  contentDescription = "Kembali ke Aplikasi Utama TeachOps"
                )
              }
            },
            actions = {
              IconButton(
                onClick = {
                  externalWebViewInstance?.reload()
                },
                modifier = Modifier.testTag("btn_refresh_external")
              ) {
                Icon(
                  imageVector = Icons.Default.Refresh,
                  contentDescription = "Muat Ulang"
                )
              }
              IconButton(
                onClick = {
                  try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(externalUrl))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                  } catch (e: Exception) {
                    Log.e("TeachOpsWeb", "Failed to launch external browser: ${e.message}")
                  }
                },
                modifier = Modifier.testTag("btn_open_external_browser")
              ) {
                Icon(
                  imageVector = Icons.Default.OpenInBrowser,
                  contentDescription = "Buka di Browser Eksternal"
                )
              }
              IconButton(
                onClick = {
                  externalUrl = null
                  externalTitle = null
                },
                modifier = Modifier.testTag("btn_close_external_app")
              ) {
                Icon(
                  imageVector = Icons.Default.Close,
                  contentDescription = "Tutup & Kembali"
                )
              }
            },
            colors = TopAppBarDefaults.topAppBarColors(
              containerColor = MaterialTheme.colorScheme.surface
            )
          )
        }
      ) { innerPadding ->
        AndroidView(
          modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .testTag("external_sub_webview"),
          factory = { ctx ->
            WebView(ctx).apply {
              layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
              )
              settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
              }
              webChromeClient = WebChromeClient()
              webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                  return false // keep navigation inside this in-app webview
                }
              }
              loadUrl(externalUrl!!)
              externalWebViewInstance = this
            }
          },
          update = { webView ->
            externalWebViewInstance = webView
          }
        )
      }
    }
  }
}

