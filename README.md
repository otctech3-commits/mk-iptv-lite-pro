<div align="center">

# 📺 MK IPTV LITE PRO v2.0 

<img src="https://readme-typing-svg.herokuapp.com?font=Inter&weight=900&size=30&duration=3000&pause=1000&color=3B82F6&center=true&vCenter=true&width=600&lines=Stream+50,000%2B+Channels;VLC+Mode+%7C+CORS+Proxy+%7C+1-Tap+VLC;Zero+Lag+%7C+Lite+Engine+%7C+Ads+Ready" alt="Typing SVG" />

[![GitHub Pages](https://img.shields.io/badge/LIVE-DEMO-10b981?style=for-the-badge&logo=github)](https://yourusername.github.io/mk-iptv-lite-pro)
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge)](#license)
[![Channels](https://img.shields.io/badge/Channels-50K+-f59e0b?style=for-the-badge)](#)
[![Lite](https://img.shields.io/badge/LITE-MODE-8b5cf6?style=for-the-badge)](#lite-engine)

**Lite version. Try Pro version also.**

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="700">

</div>

---

## 🚀 What is MK IPTV LITE PRO?

**The fastest M3U/M3U8 player that won't crash your browser.** Built to handle massive playlists with 50,000+ channels using virtual scrolling, chunked parsing, and smart memory management.

**Works like Cricfy TV** but 100% free, open-source, and runs on GitHub Pages.

<img src="https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" width="50"> **LIVE DEMO:** [Click Here](https://yourusername.github.io/mk-iptv-lite-pro)

---

## ⚡ Features

<table>
<tr>
<td width="50%">

### 🎯 Core Features
- ✅ **50,000+ Channels** - No lag, no crash
- ✅ **VLC Mode** - mpegts.js buffer tricks
- ✅ **1-Tap VLC** - Instant redirect to VLC app
- ✅ **CORS Proxy** - Bypass blocked streams
- ✅ **Audio Switching** - Multi-language support
- ✅ **Auto-Play** - Default playlist on load
- ✅ **Virtual Scroll** - Render 100 channels/page
- ✅ **Search** - Debounced, instant results

</td>
<td width="50%">

### 💰 Monetization Ready
- ✅ **5 Ad Slots** - Header, Sidebar, Pre-roll, In-content, Footer
- ✅ **Pre-roll Ads** - 5sec skip ads before stream
- ✅ **AdSense Ready** - Just paste your ID
- ✅ **Lite Mode** - Fast load = More ad views
- ✅ **Mobile Optimized** - 70% mobile traffic
- ✅ **SEO Friendly** - Rank on Google
- ✅ **PWA Support** - Install as app
- ✅ **Analytics** - Track watch time

</td>
</tr>
</table>

---

## 🎬 Lite Engine Explained

<img src="https://user-images.githubusercontent.com/74038190/212257467-871d32b7-e401-42e8-a166-fcfd7baa4c6b.gif" width="100">

**Problem:** Loading 50,000 channels crashes browsers. 500MB+ M3U files freeze tabs.

**Solution:** MK IPTV LITE PRO uses 3 tricks:

1. **Chunked Parsing** - Reads M3U in 500-line chunks. Browser never freezes
2. **Virtual Scroll** - Only renders 100 channels at once. 50k channels = 60fps scroll  
3. **Lazy Images** - Channel logos load only when visible. Saves 95% bandwidth

**Result:** 50,000 channels load in <3 seconds. Zero lag.

```javascript
// LITE MODE CODE
const ITEMS_PER_PAGE = 100; // Only 100 DOM nodes
const channelChunkSize = 500; // Parse 500 lines at a time
await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser
