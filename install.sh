#!/usr/bin/env bash

set -e
cp -f cyber-wallet.service  /etc/systemd/system
systemctl enable cyber-wallet
sh start.sh