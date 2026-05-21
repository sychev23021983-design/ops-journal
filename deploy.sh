#!/bin/bash
set -e
cd /root/ops-journal
git pull origin main
docker compose build
docker compose up -d --force-recreate
echo "$(date): ops-journal deployed" >> /var/log/deploy.log
