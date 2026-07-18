<<<<<<< HEAD
---
title: AWS IoT Core MQTT ベストプラクティス
tags: [aws, iot, mqtt]
private: false
qiita_id: f9d6d64a7b58125e0fda
lang: ja
---
=======
>>>>>>> b189080 (投稿は1行に3つずつ表示され、タブコンテナ内で増えるにつれて折り返して下の行へ送られます。)

# AWS IoT Core MQTT ベストプラクティス

英語版はこちら → [English Version](iot-core-mqtt-bestpractice-en.md)

---

## MQTT 設計の基本

- Topic は階層構造を意識  
- デバイスIDは固定フォーマット  
- JSON ペイロードは軽量化  
- QoS1 は必要な場合のみ  
- Shadow は状態管理に限定

## 推奨トピック構造

