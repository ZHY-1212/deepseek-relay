#!/bin/bash
# DeepSeek Relay - SSL 证书初始化
# 用法: DOMAIN=your-domain.com ./init-ssl.sh

set -e

if [ -z "$DOMAIN" ]; then
    echo "请先设置 DOMAIN 变量："
    echo "  DOMAIN=your-domain.com ./init-ssl.sh"
    exit 1
fi

echo "=== 1. 启动 nginx（仅 80 端口，用于证书验证）==="
docker compose up -d nginx

echo "=== 2. 申请 Let's Encrypt 证书 ==="
docker compose run --rm certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$ADMIN_EMAIL" \
    --agree-tos \
    --non-interactive

echo "=== 3. 重载 nginx 加载 SSL ==="
docker compose exec nginx nginx -s reload

echo "=== 4. 完成 ==="
echo "访问 https://$DOMAIN 验证"
echo ""
echo "证书自动续期（添加到 crontab）："
echo "  0 3 * * * cd $(pwd) && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload"
