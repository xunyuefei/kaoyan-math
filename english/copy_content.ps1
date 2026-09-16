$src = 'c:\Users\31085\Desktop\红宝书讲义_排版修复版\md_output'
$dst = 'c:\Users\31085\Desktop\数学练习产出Note\english\content'

for ($i = 1; $i -le 22; $i++) {
    $num = '{0:D2}' -f $i
    $srcPattern = "红宝书 List $num 全景深度特训讲义_精排版.html"
    $srcFile = Join-Path $src $srcPattern
    $dstFile = Join-Path $dst "list-$num.html"
    if (Test-Path $srcFile) {
        Copy-Item $srcFile $dstFile -Force
        Write-Host "Copied: list-$num.html"
    } else {
        Write-Host "MISSING: $srcPattern"
    }
}

# 词组特训
$phraseFile = Join-Path $src '红宝书全景深度特训讲义_精排版.html'
if (Test-Path $phraseFile) {
    Copy-Item $phraseFile (Join-Path $dst 'phrases.html') -Force
    Write-Host 'Copied: phrases.html'
}

# 阅读态
$readFile = Join-Path $src '红宝书阅读态势全景深度特训讲义_精排版.html'
if (Test-Path $readFile) {
    Copy-Item $readFile (Join-Path $dst 'reading.html') -Force
    Write-Host 'Copied: reading.html'
}
