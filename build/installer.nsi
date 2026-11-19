; FrostWolf installer: installs for the current user (no admin rights), adds Start menu and
; desktop shortcuts and an entry in "Installed apps" to uninstall it.
; makensis -DVERSION=<version> -DSRC=<dist dir with app\ and frostwolf.ico> installer.nsi
Unicode true
SetCompressor /SOLID lzma

!define NAME "FrostWolf"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\FrostWolf"

Name "${NAME}"
OutFile "${SRC}\FrostWolf-${VERSION}-win64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\FrostWolf"
RequestExecutionLevel user
Icon "${SRC}\frostwolf.ico"
UninstallIcon "${SRC}\frostwolf.ico"
BrandingText "FrostWolf ${VERSION}"

Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "FrostWolf"
  ; Never install over an unrelated, non-empty folder (the uninstaller removes the whole folder).
  IfFileExists "$INSTDIR\*.*" 0 empty_or_new
    IfFileExists "$INSTDIR\frostwolf.exe" empty_or_new 0
      MessageBox MB_ICONSTOP "$INSTDIR is not empty. Please choose an empty folder for FrostWolf."
      Abort
  empty_or_new:
  SetOutPath "$INSTDIR"
  File /r "${SRC}\app\*"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortcut "$SMPROGRAMS\FrostWolf.lnk" "$INSTDIR\frostwolf.exe"
  CreateShortcut "$DESKTOP\FrostWolf.lnk" "$INSTDIR\frostwolf.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "FrostWolf"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "FrostWolf"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\frostwolf.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "URLInfoAbout" "https://codeberg.org/anyrustslop/frostwolf"
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  ; Only remove a folder that really is a FrostWolf install.
  IfFileExists "$INSTDIR\frostwolf.exe" 0 +2
    RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\FrostWolf.lnk"
  Delete "$DESKTOP\FrostWolf.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
