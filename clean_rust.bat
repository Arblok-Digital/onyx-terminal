@echo off
echo [ONYX] Memulai pembersihan cache Rust/Cargo...
echo.

:: 1. Bersihkan Registry Cache
if exist "%USERPROFILE%\.cargo\registry" (
    echo [1/4] Menghapus Cargo registry cache...
    rmdir /s /q "%USERPROFILE%\.cargo\registry"
)

:: 2. Bersihkan Git Cache
if exist "%USERPROFILE%\.cargo\git" (
    echo [2/4] Menghapus Cargo git cache...
    rmdir /s /q "%USERPROFILE%\.cargo\git"
)

:: 3. Bersihkan Advisory DB
if exist "%USERPROFILE%\.cargo\advisory-db" (
    echo [3/4] Menghapus Cargo advisory database...
    rmdir /s /q "%USERPROFILE%\.cargo\advisory-db"
)

:: 4. Bersihkan folder target di project
echo [4/4] Menghapus folder target project...
if exist "onyx-protocol\target" (
    rmdir /s /q "onyx-protocol\target"
)

echo.
echo [ONYX] Pembersihan SELESAI!
echo [ONYX] Sekarang lo bisa coba instal Anchor lagi pake:
echo        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
echo.
pause
