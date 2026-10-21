# deploy.ps1 - Skrip 1-Klik Pembaruan ArusKas ke VPS
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     ARUSKAS - AUTO DEPLOY KE VPS       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Pastikan perubahan sudah dicommit
$status = git status --porcelain
if ($status) {
    Write-Host "[INFO] Ada perubahan lokal yang belum di-commit:" -ForegroundColor Yellow
    git status -s
    $msg = Read-Host "`nMasukkan pesan commit (kosongkan untuk batal)"
    if (-not $msg) {
        Write-Host "[ABORT] Deploy dibatalkan." -ForegroundColor Red
        exit 0
    }
    git add -A
    git commit -m "$msg"
}

# 2. Push ke GitHub
Write-Host "`n[1/2] Mengunggah perubahan ke GitHub..." -ForegroundColor Cyan
git push origin main

# 3. Pull di VPS
Write-Host "`n[2/2] Memperbarui kode di VPS (bisabaca-vps)..." -ForegroundColor Cyan
ssh -o BatchMode=yes bisabaca-vps "cd /home/ubuntu/CashFlow && git pull origin main"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "[BERHASIL] Aplikasi ArusKas berhasil di-update di VPS!" -ForegroundColor Green
Write-Host "- https://bpservice.biz.id/kas/" -ForegroundColor Yellow
Write-Host "- https://kas.bisabaca.web.id/ (aktif jika DNS sudah diarahkan)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
