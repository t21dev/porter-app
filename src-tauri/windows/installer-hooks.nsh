; Hooks for Tauri's NSIS installer (bundle.windows.nsis.installerHooks).
;
; The installer is perMachine (tauri.conf.json): it installs to Program Files
; for all users and runs elevated. Up to 0.8.2 it was per user and installed to
; %LOCALAPPDATA%\Porter. Tauri's own upgrade check only looks in HKLM, so it
; would not see that copy. PREINSTALL uninstalls it, so people don't end up with
; two Porters, two Start menu entries and two porters on the PATH. Settings and
; pinned ports live in %APPDATA% / %LOCALAPPDATA%\com.triptoafsin.porter, not in
; the install folder, and a silent uninstall never deletes them.
;
; porter, the terminal version installed next to Porter.exe, goes on the system
; PATH. porter edits the registry itself: NSIS's own string functions stop at
; 1024 characters, and a PATH written back through them is cut short.

!macro NSIS_HOOK_PREINSTALL
  ; The old per-user install, if this user has one. It is the elevated user's
  ; HKCU; an install made under another account is left alone.
  ReadRegStr $R8 HKCU "${UNINSTKEY}" "UninstallString"
  ReadRegStr $R9 HKCU "${MANUPRODUCTKEY}" ""
  ${If} $R8 != ""
  ${AndIf} $R9 != ""
  ${AndIf} $R9 != $INSTDIR
  ${AndIf} ${FileExists} "$R9\uninstall.exe"
    DetailPrint "Removing the earlier per-user install in $R9"
    ; /S: silent; it closes a running Porter, takes porter off the user PATH
    ; (its own hook), removes its shortcuts and its Apps entry, and keeps the
    ; app data. _?= makes ExecWait wait for it; it then can't delete itself.
    ClearErrors
    ExecWait '"$R9\uninstall.exe" /S _?=$R9' $0
    ${IfNot} ${Errors}
    ${AndIf} $0 = 0
      Delete "$R9\uninstall.exe"
      RMDir "$R9"
      DeleteRegKey HKCU "${MANUPRODUCTKEY}"
      DeleteRegKey /ifempty HKCU "${MANUKEY}"
    ${Else}
      DetailPrint "Couldn't remove it (exit code $0). Uninstall it from Settings > Apps."
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  nsExec::Exec '"$INSTDIR\porter.exe" path add --all-users'
  Pop $0
  ${If} $0 <> 0
    ; The system PATH couldn't be written: this user's PATH instead, which the
    ; app's "Command line tool" setting can also change.
    nsExec::Exec '"$INSTDIR\porter.exe" path add'
    Pop $0
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec '"$INSTDIR\porter.exe" path remove --all-users'
  Pop $0
  nsExec::Exec '"$INSTDIR\porter.exe" path remove'
  Pop $0
!macroend
