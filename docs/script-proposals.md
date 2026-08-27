# Script proposals

Candidate scripts for the collections, produced by auditing the current Windows, macOS and Linux
privacy and hardening surfaces against the scripts already in the catalog.

Nothing here is in the catalog yet. Each entry carries a ready-to-paste YAML block, the category it
belongs under, and the sources it was verified against.

Reference URLs are written as code spans rather than links, so that adding a proposal does not put
a hundred vendor URLs into the repository's dead-link check. Convert them to proper reference-style
links, preferring archived copies, when an entry is moved into a collection.

## Status of each entry

- **Vetted** - checked for duplication against the existing collections, confirmed to still exist
  and still have the documented effect on current OS versions, and reviewed for safety and working
  code.
- **Unvetted** - researched but not yet put through that second pass. Do not merge an unvetted entry
  without checking it: the vetting pass rejected 6 of the 41 entries it reviewed, including one that
  was already covered more completely by an existing script.

## Rules these proposals follow

- Nothing that disables Windows Update, code signing, Gatekeeper, SIP, FileVault or antivirus. Those
  belong to the existing, clearly-labelled "Privacy over security" section.
- Nothing that can leave a machine unbootable, unpatchable or unable to log in.
- Every entry is reversible, and the revert restores the real documented default rather than a guess.
- `recommend: standard` only where a typical user loses no functionality; `strict` where privacy is
  traded for convenience; omitted entirely for anything niche, opinionated or risky.

## Vetted proposals (35)

All Windows. The macOS, Linux and browser sets below have not been vetted yet.

### Hardening (14)

#### Enable Local Security Authority (LSA) protection

- **Category:** Security improvements
- **Recommendation:** `strict`
- **Applies to:** Windows 11, version 22H2 and later, all editions (Home, Pro, Enterprise, Education). Not applied on Windows 10, where only the non-revertible UEFI-lock value 1 is honoured. Complementary to Credential Guard, not a replacement.
- **Benefit:** Makes LSASS.exe run as a protected process, so programs running with administrator rights can no longer read its memory or inject code into it. This is the single most effective built-in defence against credential-dumping tools that harvest password hashes and Kerberos tickets. Microsoft only enables it automatically on clean Windows 11 22H2+ installs that are enterprise-joined and HVCI-capable, so personal and home machines almost always run without it.
- **Side effects:** LSA add-ons that are not signed by Microsoft stop loading: some smart card drivers, cryptographic plug-ins and password filters. You cannot attach a debugger to LSASS.exe. Requires a restart. The script writes value 2 ("Enabled without UEFI lock") so it stays revertible; value 2 is only enforced on Windows 11 22H2 and later, so the script is version-gated and skips Windows 10.
- **Vetting note:** DUPLICATE: grepped windows.yaml for RunAsPPL, LsaCfgFlags, 'lsass' — only hits are line 13567 (an NTLMv1/LM doc citation) and line 17561, which is inside a commented-out `# -  # Too good to disable` block ("Disable LSA protection", LsaCfgFlags, i.e. Credential Guard, not RunAsPPL). Nothing live. New. OBSOLETE/INEFFECTIVE: verified against `https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection` (updated 2026-02-16). It states verbatim: "To configure the feature without a UEFI variable, use a type of dword and a data value of 00000002. This value is only enforced on Windows 11 build 22H2 and later." The 'Automatic enablement' section matches the proposal exactly: default-on only if (a) new install of 22H2+, (b) enterprise/Entra/hybrid joined, (c) HVCI-capable. The doc also confirms the two side effects claimed: "Any plug-ins that are unsigned or aren't signed with a Microsoft signature fail to load in LSA. Examples of plug-ins are smart card drivers, cryptographic plug-ins, and password filters" and "You can't attach a debugger to LSASS when it's a protected process." Note: the same page also loosely says value 2 "is applied by default on devices with a new installation of Windows 11 version 22H2 or later" without the join/HVCI qualifiers, so on some clean 22H2+ machines this will be a no-op — but it is still effective on in-place-upgraded and non-joined devices, which is the common privacy.sexy user. UNSAFE: no. Value 2 deliberately avoids the UEFI lock, so revert needs no Microsoft opt-out tool (doc: the opt-out tool is only needed when "the PPL feature was enabled with a UEFI variable"). deleteOnRevert restores the OS default in both directions (delete => OS default applies), which is correct. Does not touch updates, Gatekeeper-equivalents, Defender, or boot chain. BROKEN CODE: compiled it into windows.yaml and ran `vitest tests/integration CompositeApplicationLoader` — passes. Dumped the generated batch: the minimumWindowsVersion gate resolves to build 10.0.22621 via RunPowerShellWithWindowsVersionConstraints (Windows11-22H2 is a declared allowed value at windows.yaml:41823) and wraps both apply and revert, so it is a clean no-op on Windows 10. `reg add 'HKLM\SYSTEM\...\Lsa' /v 'RunAsPPL' ...` is single-quoted, locale-independent, and ShowComputerRestartSuggestion takes no parameters (windows.yaml:40583). Indentation (12/16) matches the existing direct script children of `category: Security improvements` (e.g. windows.yaml:14447 'Enable Data Execution Prevention (DEP)'). recommend strict is right — not standard, because non-Microsoft LSA plug-ins silently stop loading.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-lsa#configurelsaprotectedprocess`
  - `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference`

```yaml
            -
                name: Enable Local Security Authority (LSA) protection
                recommend: strict # Blocks non-Microsoft-signed LSA plug-ins such as some smart card drivers and password filters
                docs: |-
                    This script makes Windows run the Local Security Authority process (`LSASS.exe`) as a
                    protected process.

                    `LSASS.exe` checks every sign-in and holds the secrets that prove who you are, such as
                    password hashes and Kerberos tickets [1]. Without this protection, any program that runs
                    with administrator rights can read that memory and copy those secrets. This is how
                    credential-dumping tools work.

                    When LSA protection is on, Windows loads only Microsoft-signed code into the process and
                    stops other programs from reading its memory or injecting code into it [1].

                    Windows can turn this protection on by itself, but only when the device is a clean
                    installation of Windows 11, version 22H2 or later, is joined to a company or school
                    directory, and supports memory integrity [1]. Personal and home devices therefore usually
                    run without it.

                    ### Technical details

                    The script sets `HKLM\SYSTEM\CurrentControlSet\Control\Lsa!RunAsPPL` to `2`, which means
                    "Enabled without UEFI lock" [1] [2]. The value `1` would store the setting in the
                    firmware, and undoing it would then need a separate Microsoft opt-out tool [1]. The value
                    `2` is only enforced on Windows 11, version 22H2 and later [1], so this script does not
                    run on earlier versions.

                    > **Caution:**
                    > - Add-ons that load into the Local Security Authority and are not signed by Microsoft
                    >   stop working. Examples are some smart card drivers, cryptographic plug-ins and
                    >   password filters [1].
                    > - You cannot attach a debugger to `LSASS.exe` while this protection is on [1].
                    > - The change needs a restart.

                    If you do not run this script, `LSASS.exe` runs unprotected on most personal devices and
                    its memory stays readable by any program with administrator rights.

                    [1]: https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection "Configure added LSA protection | Microsoft Learn"
                    [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-lsa#configurelsaprotectedprocess "LocalSecurityAuthority - ConfigureLsaProtectedProcess | Policy CSP | Microsoft Learn"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SYSTEM\CurrentControlSet\Control\Lsa
                            valueName: RunAsPPL
                            dataType: REG_DWORD
                            data: "2" # 2: Enabled without UEFI lock (revertible), 1: Enabled with UEFI lock (needs Microsoft opt-out tool)
                            deleteOnRevert: 'true' # Missing by default on Windows 11 devices that are not enterprise-joined clean installations
                            minimumWindowsVersion: Windows11-22H2 # Value "2" is only enforced on Windows 11, version 22H2 and later
                    -
                        function: ShowComputerRestartSuggestion
```

#### Disable WDigest credential caching

- **Category:** Security improvements
- **Recommendation:** `standard`
- **Applies to:** Windows 10 22H2 and Windows 11 (all editions). Machine-scope, no SKU restriction; the value is read directly by wdigest.dll, not by a Group Policy client extension.
- **Benefit:** Pins the WDigest security provider to "never keep a copy of the plaintext password in LSASS memory". Windows 8.1 and later already behave this way when the value is absent, but the value is the classic post-exploitation switch: attackers with admin rights set UseLogonCredential=1, wait for the next sign-in and then read cleartext passwords out of LSASS. Writing an explicit 0 removes that one-step downgrade.
- **Side effects:** None on Windows 10 or Windows 11: WDigest credential caching is already off by default there, so this only makes the secure state explicit. Only legacy software that genuinely requires HTTP Digest single sign-on with cached credentials would be affected, and such software is already broken on these OS versions.
- **Vetting note:** DUPLICATE: grep for UseLogonCredential, WDigest, SecurityProviders in windows.yaml => 0 hits. The nearest neighbours are 'Disable storage of the LAN Manager password hashes' (NoLmHash, windows.yaml:14511) and 'Disable insecure "LM & NTLM" protocols' (LmCompatibilityLevel=5, windows.yaml:13551) — different values, different providers. New. OBSOLETE/INEFFECTIVE: this is the one I nearly rejected. On every OS privacy.sexy supports, absence of the value already means 'no plaintext caching' (KB2871997 / Windows 8.1+), so the script produces no behavioural change on a clean system, and writing 0 does not stop an admin-level attacker from writing 1 — the benefit statement ('removes that one-step downgrade') overstates it. I accepted anyway because (a) the value is read directly by wdigest.dll, so it is genuinely honoured, not silently reset; (b) writing an explicit 0 does defend against the realistic case of a stale image, an old hardening guide, or remote-support software having set 1; and (c) the catalog already establishes exactly this 'pin the secure default' pattern — 'Disable basic authentication in WinRM' (windows.yaml:13771) says in its own docs "While WinRM clients do not use Basic authentication by default [2], this script ensures that this less secure method remains disabled." Rejecting this while that ships would be inconsistent. The proposal's docs are honest about the no-op ('the behaviour is the same on a clean system'). UNSAFE: no. Zero side effects on Windows 10/11; deleteOnRevert restores the documented absent-means-disabled default. BROKEN CODE: parsed and compiled cleanly in the integration run; single SetRegistryValue call with only declared parameters (keyPath/valueName/dataType/data/deleteOnRevert per windows.yaml:41042). recommend standard is correct and confirmed, not overstated — there is no functionality to lose.
- **Sources:**
  - `https://support.microsoft.com/en-us/topic/microsoft-security-advisory-update-to-improve-credentials-protection-and-management-may-13-2014-93434251-04ac-b7f3-52aa-9f951c14b649`
  - `https://learn.microsoft.com/en-us/archive/blogs/kfalde/kb2871997-and-wdigest-part-1`

```yaml
            -
                name: Disable WDigest credential caching
                recommend: standard # No functional change on Windows 10/11 where WDigest caching is already off by default
                docs: |-
                    This script stops the WDigest security provider from keeping a copy of your password in
                    memory.

                    WDigest is an old authentication provider. When it is active, `lsass.exe` keeps a copy of
                    the signed-in user's password in memory in a form that can be turned back into readable
                    text [1] [2]. Anyone who can read that memory can therefore read the password itself, not
                    just a hash.

                    Since Windows 8.1 and Windows Server 2012 R2, this caching is off by default and the
                    registry value that controls it does not exist [1] [2] [3]. That is the reason attackers
                    with administrator rights create the value, set it to `1`, wait for the next sign-in and
                    then read the password from memory.

                    This script writes the value explicitly as `0`, so the secure behaviour is recorded on the
                    system instead of only being the built-in default. Reverting deletes the value again,
                    which restores the documented Windows default.

                    ### Technical details

                    The script sets
                    `HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest!UseLogonCredential`
                    to `0`. A value of `0` means WDigest does not store credentials in memory, and `1` means
                    it does [1] [3].

                    If you do not run this script, the behaviour is the same on a clean system, but nothing
                    records the choice, so a single registry write is enough to expose plaintext passwords
                    again.

                    [1]: https://support.microsoft.com/en-us/topic/microsoft-security-advisory-update-to-improve-credentials-protection-and-management-may-13-2014-93434251-04ac-b7f3-52aa-9f951c14b649 "Microsoft Security Advisory: Update to improve credentials protection and management (KB2871997) | Microsoft Support"
                    [2]: https://learn.microsoft.com/en-us/archive/blogs/kfalde/kb2871997-and-wdigest-part-1 "KB2871997 and WDigest - Part 1 | Microsoft Learn"
                    [3]: https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection "Configure added LSA protection | Microsoft Learn"
                call:
                    function: SetRegistryValue
                    parameters:
                        keyPath: HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest
                        valueName: UseLogonCredential
                        dataType: REG_DWORD
                        data: "0"
                        deleteOnRevert: 'true' # Missing by default since Windows 8.1; absence means caching is disabled
```

#### Disable insecure "NTLMv1" single sign-on credentials

- **Category:** Security improvements
- **Recommendation:** `strict`
- **Applies to:** Windows 11, version 24H2 and later (Home, Pro, Enterprise, Education, IoT Enterprise, SE, Enterprise Multi-Session) and Windows Server 2025. Harmless no-op on earlier builds, which ignore the value. Has no effect while Credential Guard is on.
- **Benefit:** Switches the new NTLMv1 single-sign-on control from "Audit" to "Enforce", so Windows refuses to hand out NTLMv1-derived credentials to higher-level protocols. NTLMv1 cryptography is trivially crackable and is the remaining path by which MS-CHAPv2-based Wi-Fi, Ethernet and VPN single sign-on leaks usable credential material. Microsoft plans to flip the default to Enforce around October 2026, so this applies the vendor's own end state early.
- **Side effects:** Single sign-on stops working for Wi-Fi, Ethernet and VPN profiles that use MS-CHAPv2; Microsoft documents that entering credentials manually keeps working even in Enforce mode. Has no effect when Credential Guard is enabled, because Credential Guard already blocks the same requests. Look for event ID 4025 to see what would break before enforcing.
- **Vetting note:** DUPLICATE: grep MSV1_0 => 0 hits; grep BlockNtlmv1SSO => 0 hits; the only 'ntlmv1' hit is a citation URL at windows.yaml:13567 inside 'Disable insecure "LM & NTLM" protocols', which sets LmCompatibilityLevel=5 — a different control (network authentication level, not issuance of NTLMv1-derived credentials to higher-level protocols such as MS-CHAPv2). New. OBSOLETE/INEFFECTIVE: fully verified against `https://support.microsoft.com/en-us/topic/upcoming-changes-to-ntlmv1-in-windows-11-version-24h2-and-windows-server-2025-c0554217-cdbc-420f-b47c-e02b2db49b2e.` Confirmed verbatim: registry "HKEY_LOCAL_MACHINE\SYSTEM\currentcontrolset\control\lsa\msv1_0" value "BlockNtlmv1SSO"; "0 (default) - ... audited but allowed to succeed", "1 – ... blocked"; Event ID 4024 (Audit, warning) / 4025 (Enforce, error); "In October 2026, Microsoft will set the default value of BlockNTLMv1SSO registry key to 1 (Enforce)"; "The upcoming changes only affect devices where Credential guard is disabled"; "manually entering credentials will continue to work even in Enforce mode". Applicable editions per the article include Home and Pro, so no SKU problem. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features` corroborates the docs' framing: "NTLMv1 is removed starting in Windows 11, version 24H2 and Windows Server 2025." On pre-24H2 builds the value is simply ignored, so it is a harmless no-op rather than a broken write. UNSAFE: no — does not disable NTLM system-wide, does not touch updates/AV/boot; deleteOnRevert returns to Audit (the documented default). BROKEN CODE: compiled and parsed in the integration run; SetRegistryValue + ShowComputerRestartSuggestion, both with declared parameters. Placement nit only (not a rejection reason): the name follows the 'Disable insecure "X"' convention of the `Disable insecure protocols` category (windows.yaml:13137) but is proposed as a direct child of `Security improvements`; a maintainer may prefer to move it there for consistency. recommend strict is correct — MS-CHAPv2 SSO for corporate Wi-Fi/Ethernet/VPN stops working.
- **Sources:**
  - `https://support.microsoft.com/en-us/topic/upcoming-changes-to-ntlmv1-in-windows-11-version-24h2-and-windows-server-2025-c0554217-cdbc-420f-b47c-e02b2db49b2e`

```yaml
            -
                name: Disable insecure "NTLMv1" single sign-on credentials
                recommend: strict # Breaks single sign-on for MS-CHAPv2 Wi-Fi, Ethernet and VPN profiles; manual sign-in still works
                docs: |-
                    This script stops Windows from handing out NTLMv1-based credentials for single sign-on.

                    The NTLMv1 protocol itself is gone from Windows, but parts of its cryptography are still
                    used by some higher-level protocols for single sign-on, for example MS-CHAPv2 in Wi-Fi,
                    Ethernet and VPN sign-in [1]. That cryptography is weak, so a credential collected this
                    way can be cracked or replayed.

                    Windows 11, version 24H2 and Windows Server 2025 added a switch for this. It starts in
                    **Audit** mode, where such requests are only written to the event log and still succeed
                    [1]. This script sets it to **Enforce**, where the requests are blocked and an error event
                    is written instead [1].

                    Microsoft plans to change the default to Enforce around October 2026 on devices where the
                    value was never set [1], so this script applies the vendor's own end state earlier.

                    ### Technical details

                    The script sets `HKLM\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0!BlockNtlmv1SSO` to `1`.
                    `0` is Audit mode and is the default, `1` is Enforce mode [1].

                    You can see what would break before enforcing: Audit mode writes warning event `4024`,
                    and Enforce mode writes error event `4025` [1].

                    > **Caution:**
                    > - Single sign-on flows that rely on MS-CHAPv2, such as some corporate Wi-Fi, Ethernet
                    >   and VPN profiles, stop working. Typing the credentials by hand keeps working [1].
                    > - The setting has no effect when Credential Guard is enabled, because Credential Guard
                    >   already blocks the same requests [1].

                    If you do not run this script, Windows keeps allowing NTLMv1-derived credentials and only
                    records them in the event log until Microsoft changes the default.

                    [1]: https://support.microsoft.com/en-us/topic/upcoming-changes-to-ntlmv1-in-windows-11-version-24h2-and-windows-server-2025-c0554217-cdbc-420f-b47c-e02b2db49b2e "Upcoming changes to NTLMv1 in Windows 11, version 24H2 and Windows Server 2025 | Microsoft Support"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SYSTEM\CurrentControlSet\Control\Lsa\MSV1_0
                            valueName: BlockNtlmv1SSO
                            dataType: REG_DWORD
                            data: "1" # 0: Audit (default), 1: Enforce
                            deleteOnRevert: 'true' # Missing by default; absence means Audit mode
                    -
                        function: ShowComputerRestartSuggestion
```

#### Disable Windows Script Host

- **Category:** Security improvements
- **Recommendation:** `strict`
- **Applies to:** Windows 10 22H2 and Windows 11, all editions. Machine-scope, no SKU restriction. Note that a per-user HKCU value takes precedence over HKLM, so a user who set HKCU themselves keeps that setting.
- **Benefit:** Blocks execution of .vbs, .vbe, .js, .jse, .wsf and .wsh scripts through wscript.exe and cscript.exe, machine-wide. This is one of the oldest and still most-used malware delivery paths on Windows (mail attachments, USB shortcut worms, archive droppers) and Microsoft has deprecated VBScript, so almost nothing legitimate on a personal machine needs it.
- **Side effects:** Some installers and vendor maintenance tools run helper .vbs scripts and will fail with "Windows Script Host access is disabled on this machine". Administrative scripts you wrote in VBScript or JScript stop running. Revert (or temporarily revert) before running such installers. Does not affect PowerShell, batch files or .NET applications.
- **Vetting note:** DUPLICATE: grep 'Windows Script Host', 'script host' => 0 hits. grep wscript/cscript found only unrelated uses (windows.yaml:2534 and the RemoveShortcutFiles function at 39842). New. OBSOLETE/INEFFECTIVE: the `Enabled` DWORD under `HKLM\SOFTWARE\Microsoft\Windows Script Host\Settings` is still the mechanism that produces the 'Windows Script Host access is disabled on this machine' error; the cited TechNet archive doc is old but the key is unchanged, and it is read by wscript.exe/cscript.exe directly, not by a Group Policy client extension, so it applies on Home. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features` confirms citation [2]: "VBScript is deprecated. In future releases of Windows, VBScript will be available as a feature on demand before its removal from the operating system." The Wow6432Node write is correct, not redundant: SysWOW64\wscript.exe is a 32-bit process and its HKLM\SOFTWARE reads are redirected to Wow6432Node. UNSAFE: does not touch updates, code signing, Defender, or boot. It does NOT break MSI installers generically — msiexec hosts VBScript custom actions itself and does not consult this value. BROKEN CODE: compiled clean. Verified the generated code handles the spaces in the key path: `reg add 'HKLM\SOFTWARE\Microsoft\Windows Script Host\Settings' /v 'Enabled' /t 'REG_DWORD' /d "$data" /f` — single-quoted, so path-with-spaces safe, and no locale dependency. WHY correctedYaml: two real gaps in the proposal's docs. (1) An intra-catalog conflict the proposal misses — windows.yaml:2534 ('Remove Windows product key from registry') runs `cscript.exe //nologo "%SYSTEMROOT%\System32\slmgr.vbs" /cpky`, which fails once this script is applied; `winrm.cmd` (which shells to winrm.vbs) breaks too. (2) The proposal notes HKCU precedence in its `appliesTo` metadata but not in the user-facing docs, where it belongs. correctedYaml adds both cautions plus a clarification that other script hosts are unaffected; the call block is unchanged. recommend strict confirmed.
- **Sources:**
  - `https://learn.microsoft.com/en-au/previous-versions/tn-archive/ee198684(v=technet.10`)
  - `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features`

```yaml
            -
                name: Disable Windows Script Host
                recommend: strict # Some installers, vendor tools and built-in .vbs helpers (slmgr.vbs, winrm.cmd) stop working
                docs: |-
                    This script stops Windows from running script files through Windows Script Host.

                    **Windows Script Host** runs `VBScript` and `JScript` files with `wscript.exe` and
                    `cscript.exe` [1]. File types such as `.vbs`, `.vbe`, `.js`, `.jse`, `.wsf` and `.wsh` all
                    go through it.

                    This is one of the oldest and still most common ways malware runs on Windows: a script
                    arrives as a mail attachment, on a USB stick or inside an archive, the user double-clicks
                    it, and Windows Script Host runs it with the user's rights. Microsoft has also deprecated
                    VBScript and plans to make it an optional feature before removing it, so very little
                    legitimate software on a personal computer still needs it [2].

                    When the setting is on and a script is started, Windows shows: "Windows Script Host access
                    is disabled on this machine. Contact your administrator for details." This message also
                    appears when the script is started from a batch file or by typing
                    `cscript.exe c:\scripts\myscript.vbs` [1].

                    ### Technical details

                    The script creates `Enabled` as a `REG_DWORD` with the data `0` under
                    `HKLM\SOFTWARE\Microsoft\Windows Script Host\Settings` [1]. The value does not exist by
                    default, and its absence means scripts are allowed [1]. The 32-bit view under
                    `HKLM\SOFTWARE\Wow6432Node\...` is set as well, so the 32-bit copies of `wscript.exe` and
                    `cscript.exe` in `SysWOW64` are covered too.

                    Only `wscript.exe` and `cscript.exe` read this setting. Other script hosts, such as the
                    one inside Windows Installer packages, are not affected.

                    > **Caution:**
                    > - Some installers and vendor maintenance tools run helper `.vbs` scripts and fail while
                    >   this setting is on. Revert the script, install the software, then apply it again.
                    > - Built-in Windows helper scripts stop working while this setting is on. Examples are
                    >   `slmgr.vbs`, used for licence and activation tasks, and `winrm.cmd`, which runs
                    >   `winrm.vbs`. Other scripts in this collection that call `cscript.exe` also fail, so
                    >   revert this script before you use them.
                    > - Your own `VBScript` or `JScript` administration scripts stop running.
                    > - A per-user value under `HKCU\SOFTWARE\Microsoft\Windows Script Host\Settings` takes
                    >   precedence, so a user who already set that value keeps their own setting.
                    > - `PowerShell`, batch files and normal programs are not affected.

                    If you do not run this script, any `.vbs` or `.js` file you open runs immediately with
                    your own user rights.

                    [1]: https://learn.microsoft.com/en-au/previous-versions/tn-archive/ee198684(v=technet.10) "Disabling Windows Script Host | Microsoft Learn"
                    [2]: https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features "Deprecated features in the Windows client | Microsoft Learn"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SOFTWARE\Microsoft\Windows Script Host\Settings
                            valueName: Enabled
                            dataType: REG_DWORD
                            data: "0"
                            deleteOnRevert: 'true' # Missing by default; absence means Windows Script Host is allowed
                    -
                        function: SetRegistryValue
                        parameters:
                            # 32-bit view, used by the "SysWOW64" copies of "wscript.exe" and "cscript.exe"
                            keyPath: HKLM\SOFTWARE\Wow6432Node\Microsoft\Windows Script Host\Settings
                            valueName: Enabled
                            dataType: REG_DWORD
                            data: "0"
                            deleteOnRevert: 'true' # Missing by default; absence means Windows Script Host is allowed
```

#### Enable strict Authenticode signature verification

- **Category:** Security improvements
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 10 22H2 and Windows 11, all editions and all supported Windows Server releases. Machine-scope, no SKU restriction. Microsoft's original advisory 2915720 publishes the value as REG_SZ "1"; REG_DWORD 1 is also honoured, so a maintainer may prefer DWORD for manageability.
- **Benefit:** Turns on the opt-in fix for CVE-2013-3900. Without it, WinVerifyTrust ignores extra data appended inside the WIN_CERTIFICATE structure of a signed executable, so an attacker can staple a malicious payload onto a legitimately signed .exe, .dll or .sys and Windows still reports it as validly signed. With the fix, such files are treated as unsigned.
- **Side effects:** Any binary that carries non-conforming data in its signature blob is reported as unsigned. This affects some older installers and self-extracting archives, and it can make AppLocker or Software Restriction Policy rules that match on publisher stop matching. There is no per-application exclusion; the switch is system-wide. Microsoft decided in 2014 not to make this the default for exactly this compatibility reason.
- **Vetting note:** DUPLICATE: grep Wintrust, EnableCertPadding, certpadding => 0 hits. New. OBSOLETE/INEFFECTIVE: verified via `https://learn.microsoft.com/en-us/answers/questions/5858974/cve-2013-3900-mitigation-compatibility-concerns-wi`, which quotes the MSRC advisory (the MSRC SPA itself returns no body to a fetcher). Confirmed it is still dormant/opt-in: "The underlying functionality for stricter verification remains in place, however, and can be enabled at customer discretion" and "will reside on the system but will be dormant functionality until enabled." Confirmed the exact registry layout the proposal writes, including the REG_SZ type: HKLM\Software\Microsoft\Cryptography\Wintrust\Config and HKLM\Software\Wow6432Node\Microsoft\Cryptography\Wintrust\Config, "EnableCertPaddingCheck"="1". Confirmed the side effects: "Non-conforming binaries will appear unsigned and, therefore, be rendered untrusted" and "Any AppLocker rule that depends on files being signed, or expects a specific publisher, may be impacted" (same for Software Restriction Policy). Both architecture paths are genuinely needed because each loads its own wintrust.dll. UNSAFE: this is the riskiest of the three signature-related proposals, and the proposal handles it correctly by shipping with no `recommend` key at all — so it lands in no preset and is explicit opt-in. It does not disable code signing; it makes verification stricter. It cannot break patching (Windows servicing does not rely on non-conforming padding). The one substantive residual risk — silently invalidating AppLocker/SRP publisher rules, i.e. weakening a security control — is documented in the proposal's own caution block. Minor deviation from the advisory: the advisory says to remove the key to disable, whereas deleteOnRevert removes only the value and leaves an empty `Config` key. Functionally identical (absence of the value = relaxed check), so not a defect. BROKEN CODE: compiled clean; two SetRegistryValue calls, declared parameters only, REG_SZ matches the advisory's .reg file. correctedRecommend 'none' just makes the proposal's own (correct) omission explicit.
- **Sources:**
  - `https://msrc.microsoft.com/update-guide/vulnerability/CVE-2013-3900`
  - `https://learn.microsoft.com/en-us/answers/questions/5858974/cve-2013-3900-mitigation-compatibility-concerns-wi`

```yaml
            -
                name: Enable strict Authenticode signature verification
                docs: |-
                    This script makes Windows check the digital signature of programs more strictly.

                    Windows uses the `WinVerifyTrust` function to decide whether a program file is correctly
                    signed. The Authenticode file format allows extra, unchecked data inside the signature
                    block of a signed file [1]. An attacker can therefore take a program that is correctly
                    signed by a trusted company, append their own code inside that unchecked area, and Windows
                    still reports the file as validly signed [1]. This is tracked as `CVE-2013-3900` [1].

                    Microsoft released the stricter check in December 2013, but decided in July 2014 not to
                    make it the default because of compatibility. It stays available as an opt-in setting in
                    all supported Windows releases, including Windows 10 and Windows 11 [1].

                    With the setting on, Windows no longer accepts extra data inside the signature block and
                    reports such files as unsigned [1].

                    ### Technical details

                    The script creates the `EnableCertPaddingCheck` value with the data `1` in both:

                    - `HKLM\SOFTWARE\Microsoft\Cryptography\Wintrust\Config` (64-bit code)
                    - `HKLM\SOFTWARE\Wow6432Node\Microsoft\Cryptography\Wintrust\Config` (32-bit code)

                    Both paths are needed because each architecture loads its own copy of `wintrust.dll` [1].
                    The value is created as `REG_SZ` with the text `1`, matching the registry file that
                    Microsoft published with the advisory [1]. Neither key exists by default, and their
                    absence means the relaxed check is used [1].

                    > **Caution:**
                    > - Programs whose signature block holds extra data are reported as unsigned. Some older
                    >   installers and self-extracting archives are affected [1].
                    > - `AppLocker` and Software Restriction Policy rules that match on the publisher may stop
                    >   matching those files [1].
                    > - There is no exception list; the setting applies to the whole system [1].

                    If you do not run this script, Windows keeps accepting signed programs that carry extra,
                    unchecked content inside their signature.

                    [1]: https://msrc.microsoft.com/update-guide/vulnerability/CVE-2013-3900 "WinVerifyTrust Signature Validation Vulnerability (CVE-2013-3900) | Microsoft Security Response Center"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SOFTWARE\Microsoft\Cryptography\Wintrust\Config
                            valueName: EnableCertPaddingCheck
                            dataType: REG_SZ
                            data: "1"
                            deleteOnRevert: 'true' # Key and value are missing by default; absence means the relaxed check
                    -
                        function: SetRegistryValue
                        parameters:
                            # 32-bit view, needed because each architecture loads its own copy of "wintrust.dll"
                            keyPath: HKLM\SOFTWARE\Wow6432Node\Microsoft\Cryptography\Wintrust\Config
                            valueName: EnableCertPaddingCheck
                            dataType: REG_SZ
                            data: "1"
                            deleteOnRevert: 'true' # Key and value are missing by default; absence means the relaxed check
```

#### Configure Kernel DMA Protection to block incompatible external devices

- **Category:** Security improvements
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 10, version 1809 and later, and Windows 11: Pro, Enterprise, Education, IoT Enterprise / IoT Enterprise LTSC. Requires firmware support for Kernel DMA Protection; otherwise the policy has no effect.
- **Benefit:** Changes the Kernel DMA Protection enumeration policy from the default "only after log in or screen unlock" to "block all", so an external Thunderbolt or PCIe device that cannot be sandboxed by the IOMMU is never enumerated, not even after you sign in. This closes the classic drive-by DMA attack where a malicious dock, external GPU enclosure or Thunderbolt device reads or writes system memory directly.
- **Side effects:** External DMA-capable peripherals whose drivers do not support DMA remapping stop working entirely: some Thunderbolt docks, external GPU enclosures, capture cards and Thunderbolt-to-PCIe adapters. Needs a restart. The policy is inert unless the firmware supports and enables Kernel DMA Protection (check the "Kernel DMA Protection" line in msinfo32), and it does not cover 1394, PCMCIA or ExpressCard devices. Policy CSP lists Pro, Enterprise, Education and IoT Enterprise, not Home.
- **Vetting note:** DUPLICATE: grep 'Kernel DMA', DmaGuard, DeviceEnumerationPolicy, Thunderbolt => no live script (the single 'Thunderbolt' hit is unrelated prose). New. OBSOLETE/INEFFECTIVE: verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-dmaguard.` Every claim checks out verbatim: Allowed values "0 | Block all (Most restrictive)", "1 (Default) | Only after log in/screen unlock", "2 | Allow all (Least restrictive)"; "Default Value | 1"; Registry Key Name "Software\Policies\Microsoft\Windows\Kernel DMA Protection"; "This policy requires a system reboot to take effect"; "This policy only takes effect when Kernel DMA Protection is supported and enabled by the system firmware ... check the Kernel DMA Protection field in the Summary page of MSINFO32.exe"; "Note this policy doesn't apply to 1394, PCMCIA or ExpressCard devices"; Editions "Pro / Enterprise / Education / IoT Enterprise" (no Home) on "Windows 10, version 1809 [10.0.17763] and later". So deleteOnRevert correctly restores the documented default of 1, and the proposal's docs do not overstate the SKU or firmware caveats. UNSAFE: real risk of losing a Thunderbolt dock (and with it dock-attached keyboard/mouse/Ethernet) on a laptop whose peripheral drivers lack DMA remapping. That is why `recommend` is correctly omitted — it enters no preset and only an informed user selecting it individually is affected, and the caution block names docks, eGPU enclosures and TB-to-PCIe adapters. It cannot break boot (internal devices are unaffected), updates, or any security control. BROKEN CODE: compiled clean; verified the generated command handles the spaces in 'Kernel DMA Protection': `reg add 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Kernel DMA Protection' /v 'DeviceEnumerationPolicy' ...` — single-quoted, locale-independent. correctedRecommend 'none' makes the proposal's own omission explicit.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-dmaguard`
  - `https://learn.microsoft.com/en-us/windows-hardware/drivers/pci/enabling-dma-remapping-for-device-drivers`

```yaml
            -
                name: Configure Kernel DMA Protection to block incompatible external devices
                docs: |-
                    This script makes Windows refuse external plug-in devices that cannot be safely contained.

                    Some external ports, such as `Thunderbolt`, let a plugged-in device read and write computer
                    memory directly. **Kernel DMA Protection** uses the chipset's I/O memory management unit
                    to fence such a device into a small memory area, so it cannot read the rest of memory [1].

                    Devices whose drivers do not support this fencing cannot be contained. By default Windows
                    allows them once you have signed in or unlocked the screen [1]. This script changes the
                    policy to **Block all**, so those devices are never used [1].

                    ### Technical details

                    The script sets
                    `HKLM\SOFTWARE\Policies\Microsoft\Windows\Kernel DMA Protection!DeviceEnumerationPolicy`
                    to `0`. The documented values are `0` (block all, most restrictive), `1` (only after log
                    in or screen unlock, the default) and `2` (allow all, least restrictive) [1].

                    > **Caution:**
                    > - External devices that need direct memory access and whose drivers do not support
                    >   memory fencing stop working. Examples are some `Thunderbolt` docks, external graphics
                    >   enclosures and `Thunderbolt`-to-`PCIe` adapters.
                    > - The change needs a restart [1].
                    > - The policy only has an effect when the computer's firmware supports and has enabled
                    >   Kernel DMA Protection. You can check this on the summary page of `MSINFO32.exe` [1].
                    > - The policy does not cover 1394, `PCMCIA` or `ExpressCard` devices [1].
                    > - Microsoft lists this policy for Pro, Enterprise, Education and IoT Enterprise
                    >   editions [1].

                    If you do not run this script, an external device that cannot be contained is still
                    accepted as soon as you sign in.

                    [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-dmaguard "DmaGuard Policy CSP - DeviceEnumerationPolicy | Microsoft Learn"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\Kernel DMA Protection
                            valueName: DeviceEnumerationPolicy
                            dataType: REG_DWORD
                            data: "0" # 0: Block all, 1: Only after log in/screen unlock (default), 2: Allow all
                            deleteOnRevert: 'true' # Missing by default; absence means the documented default of "1"
                    -
                        function: ShowComputerRestartSuggestion
```

#### Enable attack surface reduction rules against credential and driver abuse

- **Category:** Security improvements
- **Recommendation:** `strict`
- **Applies to:** Any Windows edition that includes Microsoft Defender Antivirus, including Windows 11 Home. Driver rule needs Windows 10 1709+, LSASS rule 1803+, WMI rule 1903+. No Defender for Endpoint licence is needed to enforce the rules locally; only central reporting requires one.
- **Benefit:** Turns on the three Microsoft "standard protection" attack surface reduction rules, which Microsoft says can normally be enabled in Block mode without prior audit: block writing of known-vulnerable signed drivers to disk, block reading of LSASS process memory, and block WMI event-subscription persistence. These cover kernel-driver BYOVD attacks, credential dumping and one of the most common fileless persistence techniques.
- **Side effects:** The LSASS rule produces a large volume of audit events that are safe to ignore (for example Chrome's updater touches LSASS); Microsoft documents this as expected. If LSA protection or Credential Guard is already on, the LSASS rule adds nothing. The WMI rule should be tested where Microsoft Configuration Manager is in use because that client depends heavily on WMI. All three rules require Microsoft Defender Antivirus to be the active antivirus; they silently do nothing if Defender has been replaced or disabled (including by this project's "Privacy over security" scripts).
- **Vetting note:** DUPLICATE: grep AttackSurfaceReduction / attacksurface => 0 hits, and the existing `SetMpPreference` helper (windows.yaml:43163) only wraps Set/Remove-MpPreference for scalar properties (property/value), so it cannot express paired -Ids/-Actions arrays — using RunPowerShell here is the right call, not a reinvention. New. OBSOLETE/INEFFECTIVE: verified against `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference` (ms.date 2026-07-02, updated 2026-08-14). All three GUIDs are current and are exactly Microsoft's "Standard protection rules" group: 56a863a9-875e-4185-98a7-b882c64b5ce5 (Block abuse of exploited vulnerable signed drivers), 9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2 (Block credential stealing from the Windows local security authority subsystem), e6db77e5-3df2-4cf1-b95a-636979351e5b (Block persistence through WMI event subscription). No deprecation notice on any of them. Licensing/edition claim confirmed verbatim: "ASR rules are a Microsoft Defender Antivirus feature that's available on any edition of Windows that includes Microsoft Defender Antivirus (for example, Windows 11 Home). You can configure ASR rules locally using PowerShell or Group Policy." The docs' three cautions are all doc-backed: LSASS rule — "This ASR rule produces a large volume of audit events, almost all of which are safe to ignore ... You can choose to skip the audit mode evaluation and proceed to block mode deployment", plus the Chrome-updater example and "If you enabled Local Security Authority (LSA) protection ... This ASR rule isn't required"; WMI rule — "If you use Microsoft Configuration Manager, Microsoft recommends extensive testing of this ASR rule in Audit mode ... The Configuration Manager client relies heavily on WMI." Also correct that none of these three needs cloud protection. UNSAFE: no. It adds Defender rules rather than removing protection, and does not disable AV/updates/signing. The revert is scoped: Remove-MpPreference with the same three IDs, so user-configured rules survive. BROKEN CODE: this was the part I most doubted, so I checked the cmdlet surface and then compiled. Confirmed from `https://learn.microsoft.com/en-us/powershell/module/defender/remove-mppreference` that Remove-MpPreference genuinely accepts both `[-AttackSurfaceReductionRules_Ids <String[]>]` and `[-AttackSurfaceReductionRules_Actions <ASRRuleActionType[]>]` — the revert is not calling a non-existent parameter. Add-MpPreference confirmed the same pair. Then I injected the entry into windows.yaml, ran the CompositeApplicationLoader integration test (passes) and dumped the emitted batch line: the backtick continuations are correctly collapsed by the `inlinePowerShell` pipe (mergeLinesWithBacktick), and the result is valid single-line PowerShell — `if (-Not (Get-Command 'Add-MpPreference' ...)) { Write-Warning '...'; Exit 0; }; try { Add-MpPreference -AttackSurfaceReductionRules_Ids '...' -AttackSurfaceReductionRules_Actions Enabled,Enabled,Enabled -ErrorAction Stop; Write-Host '...'; } catch { ... }`. The Get-Command guard plus try/catch means it degrades to a warning, not an error, on a clean system with Defender absent/disabled, and there is no locale or path dependency. recommend strict confirmed, not overstated: the vulnerable-signed-driver rule blocks writing drivers such as WinRing0/RTCore64 to disk, which really does break common fan-control and hardware-monitoring tool installs — so this does not belong in the standard preset.
- **Sources:**
  - `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference`
  - `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-configure`
  - `https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/microsoft-recommended-driver-block-rules`

```yaml
            -
                name: Enable attack surface reduction rules against credential and driver abuse
                recommend: strict # Low breakage, but produces many benign audit events and needs Defender Antivirus active
                docs: |-
                    This script turns on the three Microsoft "standard protection" attack surface reduction
                    rules.

                    **Attack surface reduction (ASR) rules** are a Microsoft Defender Antivirus feature that
                    blocks software behaviour attackers commonly rely on [1]. They work on any Windows edition
                    that includes Microsoft Defender Antivirus, including Windows 11 Home, and can be set
                    locally with PowerShell [1].

                    Microsoft groups three rules as *standard protection* and states that these can normally
                    be switched to Block mode without an audit period first [2]:

                    - **Block abuse of exploited vulnerable signed drivers**
                      (`56a863a9-875e-4185-98a7-b882c64b5ce5`) stops a program from writing a known-vulnerable
                      signed driver to disk. Attackers bring such drivers with them to get code into the
                      Windows kernel and switch security software off [1].
                    - **Block credential stealing from the Windows local security authority subsystem**
                      (`9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2`) stops other programs from reading the memory of
                      `lsass.exe`, where sign-in secrets live [1].
                    - **Block persistence through WMI event subscription**
                      (`e6db77e5-3df2-4cf1-b95a-636979351e5b`) stops malware from using WMI event
                      subscriptions to start itself again after a restart without leaving a file behind [1].

                    ### Technical details

                    The script uses `Add-MpPreference` with `-AttackSurfaceReductionRules_Ids` and
                    `-AttackSurfaceReductionRules_Actions Enabled`, which adds these rules without touching
                    any rule you configured yourself [2]. Reverting uses `Remove-MpPreference` with the same
                    identifiers, which removes exactly these rules and leaves the rest alone [2].

                    > **Caution:**
                    > - The rules only work while Microsoft Defender Antivirus is the active antivirus [1]. If
                    >   Defender is replaced or switched off, the script has no effect.
                    > - The credential rule writes many events for harmless programs. Microsoft documents this
                    >   and states that they are safe to ignore [1].
                    > - If you already use LSA protection or Credential Guard, the credential rule adds no
                    >   further protection [1].
                    > - If you use Microsoft Configuration Manager, test the WMI rule first, because its
                    >   client depends heavily on WMI [1].

                    If you do not run this script, these rules stay unconfigured, which is the Windows
                    default.

                    [1]: https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference "Attack surface reduction rules reference | Microsoft Learn"
                    [2]: https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-configure "Configure attack surface reduction rules and exclusions | Microsoft Learn"
                call:
                    function: RunPowerShell
                    parameters:
                        codeComment: Enable "standard protection" attack surface reduction rules
                        revertCodeComment: Remove "standard protection" attack surface reduction rules
                        code: |-
                            if (-Not (Get-Command 'Add-MpPreference' -ErrorAction SilentlyContinue)) {
                                Write-Warning 'Skipping, the "Add-MpPreference" command is not available on this system.'
                                Exit 0
                            }
                            try {
                                Add-MpPreference `
                                    -AttackSurfaceReductionRules_Ids '56a863a9-875e-4185-98a7-b882c64b5ce5','9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2','e6db77e5-3df2-4cf1-b95a-636979351e5b' `
                                    -AttackSurfaceReductionRules_Actions Enabled,Enabled,Enabled `
                                    -ErrorAction Stop
                                Write-Host 'Successfully enabled the attack surface reduction rules.'
                            } catch {
                                Write-Warning "Could not enable the attack surface reduction rules, Defender may be disabled or absent: $($_.Exception.Message)"
                            }
                        revertCode: |-
                            if (-Not (Get-Command 'Remove-MpPreference' -ErrorAction SilentlyContinue)) {
                                Write-Warning 'Skipping, the "Remove-MpPreference" command is not available on this system.'
                                Exit 0
                            }
                            try {
                                Remove-MpPreference `
                                    -AttackSurfaceReductionRules_Ids '56a863a9-875e-4185-98a7-b882c64b5ce5','9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2','e6db77e5-3df2-4cf1-b95a-636979351e5b' `
                                    -AttackSurfaceReductionRules_Actions Enabled,Enabled,Enabled `
                                    -ErrorAction Stop
                                Write-Host 'Successfully removed the attack surface reduction rules.'
                            } catch {
                                Write-Warning "Could not remove the attack surface reduction rules: $($_.Exception.Message)"
                            }
```

#### Enable attack surface reduction rules against Office and script threats

- **Category:** Security improvements
- **Recommendation:** `strict`
- **Applies to:** Any Windows edition that includes Microsoft Defender Antivirus, including Windows 11 Home. Windows 10 1709 or later for five of the rules, 1803 or later for none of them beyond that; all supported on Windows 11. Office rules are inert if Office is installed outside %ProgramFiles%.
- **Benefit:** Turns on six attack surface reduction rules that close the classic macro and script infection chain: Office apps spawning child processes, Office injecting code into other processes, VBA macros calling Win32 APIs, Office writing executable files to disk, executables and scripts dropped by mail or webmail, and JavaScript or VBScript launching downloaded executables. All six depend only on Defender Antivirus and AMSI, not on cloud protection, so they still work with cloud features turned off.
- **Side effects:** Line-of-business Office documents that legitimately start a command prompt, run PowerShell or call Win32 APIs from VBA stop working. The Office rules are only enforced when Office is installed under %ProgramFiles% or %ProgramFiles(x86)%. The Office code-injection rule needs Office restarted and is documented as incompatible with BeyondTrust Privilege Guard and Heimdal Security. Executables and scripts saved from mail or webmail become unrunnable, which can be surprising when you legitimately mail yourself an installer. Requires Microsoft Defender Antivirus to be active.
- **Vetting note:** DUPLICATE: same grep as above — no ASR rules anywhere in the catalog, and no overlap with the sibling proposal's three GUIDs. New. OBSOLETE/INEFFECTIVE: all six GUIDs verified current and correctly named against `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference`, with no deprecation notices: d4f940ab-401b-4efc-aadc-ad5f3c50688a (Block all Office applications from creating child processes), 75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84 (Block Office applications from injecting code into other processes), 92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b (Block Win32 API calls from Office macros), 3b576869-a4ec-4529-8536-b80a7769e899 (Block Office applications from creating executable content), be9ba2d9-53ea-4cdc-84e5-9b1eeee46550 (Block executable content from email client and webmail), d3e037e1-3eb8-44c8-a917-57927947596d (Block JavaScript or VBScript from launching downloaded executable content). Critically, I checked the dependency column for each: all six list only 'Microsoft Defender Antivirus' (two also AMSI) — none lists Cloud Protection — so the proposal's claim that they keep working with cloud features off (which privacy.sexy users commonly disable) is accurate. This matters because three neighbouring rules I did NOT see proposed (obfuscated scripts, prevalence/age, advanced ransomware) do require cloud protection; the proposal correctly excluded them. Doc-backed cautions confirmed verbatim: "This rule is enforced only if Office is installed in the %ProgramFiles% or %ProgramFiles(x86)% locations" (child-process and injection rules), "This ASR rule requires restarting Microsoft 365 Apps (Office applications) for the configuration changes to take effect" and "incompatible with ... BeyondTrust Privilege Guard ... Heimdal security" (injection rule), and the email rule blocking "Executable files ... Script files ... Archive files". One small inaccuracy that does not affect behaviour: the docs say 'Block Office applications from creating executable content' is subject to the %ProgramFiles% restriction, but Microsoft states "This ASR rule isn't affected by the installation location of Office" for that specific rule — the proposal's blanket phrasing ('The Office rules are only enforced when...') is slightly over-broad but is a conservative overstatement of a limitation, not a false safety claim. UNSAFE: no. Adds Defender rules; disables nothing. Revert removes exactly these six IDs. BROKEN CODE: compiled into windows.yaml and the CompositeApplicationLoader integration test passes. Same verified cmdlet surface as the sibling (Add/Remove-MpPreference both accept the paired -Ids/-Actions arrays), six IDs paired with six Enabled actions as Microsoft requires ("If you add multiple rules as a comma-separated list, specify their states separately as a comma-separated list"), Get-Command guard plus try/catch so it warns rather than fails when Defender is absent. recommend strict confirmed — blocking executables saved from webmail and Office VBA Win32 calls is real, user-visible functionality loss.
- **Sources:**
  - `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference`
  - `https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-configure`

```yaml
            -
                name: Enable attack surface reduction rules against Office and script threats
                recommend: strict # Blocks legitimate Office automation and executables saved from e-mail
                docs: |-
                    This script turns on six attack surface reduction rules that block the usual macro and
                    script infection chain.

                    **Attack surface reduction (ASR) rules** are a Microsoft Defender Antivirus feature that
                    blocks software behaviour attackers commonly rely on [1]. They work on any Windows edition
                    that includes Microsoft Defender Antivirus, including Windows 11 Home [1].

                    The rules this script turns on are [1]:

                    - **Block all Office applications from creating child processes**
                      (`d4f940ab-401b-4efc-aadc-ad5f3c50688a`). A malicious document normally starts a command
                      prompt or `PowerShell` to fetch the real payload.
                    - **Block Office applications from injecting code into other processes**
                      (`75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84`). Microsoft states there is no known legitimate
                      business reason for this behaviour.
                    - **Block Win32 API calls from Office macros**
                      (`92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b`). This stops a macro from running code in
                      memory without writing a file to disk.
                    - **Block Office applications from creating executable content**
                      (`3b576869-a4ec-4529-8536-b80a7769e899`). This stops a document from saving a program to
                      disk that would survive a restart.
                    - **Block executable content from email client and webmail**
                      (`be9ba2d9-53ea-4cdc-84e5-9b1eeee46550`). This covers programs, scripts and archives
                      that arrive by mail.
                    - **Block JavaScript or VBScript from launching downloaded executable content**
                      (`d3e037e1-3eb8-44c8-a917-57927947596d`). This breaks the common downloader script
                      pattern.

                    All six rules need only Microsoft Defender Antivirus, and two of them also the
                    Antimalware Scan Interface [1]. None of them needs cloud protection, so they keep working
                    if you have turned cloud features off for privacy.

                    ### Technical details

                    The script uses `Add-MpPreference` with `-AttackSurfaceReductionRules_Ids` and
                    `-AttackSurfaceReductionRules_Actions Enabled`, which adds these rules without touching
                    any rule you configured yourself [2]. Reverting uses `Remove-MpPreference` with the same
                    identifiers [2].

                    > **Caution:**
                    > - Office documents that legitimately start other programs, inject code or call Win32
                    >   functions from a macro stop working.
                    > - Programs, scripts and archives that you save out of a mail client or webmail cannot be
                    >   run any more.
                    > - The Office rules are only enforced when Office is installed under `%ProgramFiles%` or
                    >   `%ProgramFiles(x86)%` [1].
                    > - The code-injection rule needs Office restarted, and Microsoft lists it as incompatible
                    >   with BeyondTrust Privilege Guard and Heimdal security [1].
                    > - The rules only work while Microsoft Defender Antivirus is the active antivirus [1].

                    If you do not run this script, these rules stay unconfigured, which is the Windows
                    default.

                    [1]: https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference "Attack surface reduction rules reference | Microsoft Learn"
                    [2]: https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-configure "Configure attack surface reduction rules and exclusions | Microsoft Learn"
                call:
                    function: RunPowerShell
                    parameters:
                        codeComment: Enable attack surface reduction rules for Office and script threats
                        revertCodeComment: Remove attack surface reduction rules for Office and script threats
                        code: |-
                            if (-Not (Get-Command 'Add-MpPreference' -ErrorAction SilentlyContinue)) {
                                Write-Warning 'Skipping, the "Add-MpPreference" command is not available on this system.'
                                Exit 0
                            }
                            try {
                                Add-MpPreference `
                                    -AttackSurfaceReductionRules_Ids 'd4f940ab-401b-4efc-aadc-ad5f3c50688a','75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84','92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b','3b576869-a4ec-4529-8536-b80a7769e899','be9ba2d9-53ea-4cdc-84e5-9b1eeee46550','d3e037e1-3eb8-44c8-a917-57927947596d' `
                                    -AttackSurfaceReductionRules_Actions Enabled,Enabled,Enabled,Enabled,Enabled,Enabled `
                                    -ErrorAction Stop
                                Write-Host 'Successfully enabled the attack surface reduction rules.'
                            } catch {
                                Write-Warning "Could not enable the attack surface reduction rules, Defender may be disabled or absent: $($_.Exception.Message)"
                            }
                        revertCode: |-
                            if (-Not (Get-Command 'Remove-MpPreference' -ErrorAction SilentlyContinue)) {
                                Write-Warning 'Skipping, the "Remove-MpPreference" command is not available on this system.'
                                Exit 0
                            }
                            try {
                                Remove-MpPreference `
                                    -AttackSurfaceReductionRules_Ids 'd4f940ab-401b-4efc-aadc-ad5f3c50688a','75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84','92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b','3b576869-a4ec-4529-8536-b80a7769e899','be9ba2d9-53ea-4cdc-84e5-9b1eeee46550','d3e037e1-3eb8-44c8-a917-57927947596d' `
                                    -AttackSurfaceReductionRules_Actions Enabled,Enabled,Enabled,Enabled,Enabled,Enabled `
                                    -ErrorAction Stop
                                Write-Host 'Successfully removed the attack surface reduction rules.'
                            } catch {
                                Write-Warning "Could not remove the attack surface reduction rules: $($_.Exception.Message)"
                            }
```

#### Enable required SMB signing

- **Category:** Security improvements > Improve network security > Enable secure connections
- **Recommendation:** `strict`
- **Applies to:** Windows 10 22H2 and Windows 11, all editions. Machine-scope; the values are read by mrxsmb/srv2, not by a policy client extension, so they apply on Home as well. Note: I verified that Microsoft documents disabling on 24H2 by explicitly writing 0, which implies the 24H2 "required" default is not stored as a registry value; a maintainer should confirm on a real 24H2 image that the value is absent before relying on deleteOnRevert.
- **Benefit:** Requires SMB signing for both outgoing (client) and incoming (server) connections, which prevents tampering with file-sharing traffic and defeats SMB relay attacks. Windows 11 24H2 Pro, Enterprise and Education already require both by default, but Windows 10 22H2 and Windows 11 Home do not, so this brings older and Home systems up to the current Microsoft default.
- **Side effects:** Connections to third-party SMB servers that do not support signing fail with STATUS_INVALID_SIGNATURE (0xc000a000). Requiring signing also disables guest access to shares, which is how many consumer NAS boxes and router USB shares are reached, producing error 0x80070035 or the "unauthenticated guest access" message. Signing costs CPU, so large transfers can be slower. Needs a restart. Reverting deletes the values, which restores each Windows version's own built-in default rather than forcing "not required".
- **Vetting note:** DUPLICATE: grep RequireSecuritySignature, 'smb signing', SmbServerConfiguration => 0 hits. The four LanmanWorkstation hits (windows.yaml:13306-13310) are the SMBv1 script's `sc.exe config lanmanworkstation depend=` line, unrelated to signing. New. OBSOLETE/INEFFECTIVE: the proposal's own confidence was only 'likely' with an explicit maintainer ask, so I verified it rather than deferring. `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing` (ms.date 2025-08-13) confirms the per-edition defaults exactly as the docs state: "Windows 11, version 24H2 Enterprise, Pro, and Education require both outbound and inbound SMB signing", "Windows Server 2025 requires outbound SMB signing only", "Windows 11, version 24H2 Home edition doesn't require outbound or inbound SMB signing". It also confirms both breakage claims verbatim: "Requiring SMB signing also disables guest access to shares", the "0xc000a000 / STATUS_INVALID_SIGNATURE" error, and "Error code: 0x80070035 The network path was not found" for guest-account devices — plus Microsoft's own position that the proposal echoes: "We don't recommend disabling SMB signing as a workaround for third-party servers." The RequireSecuritySignature values under LanmanWorkstation\Parameters and LanmanServer\Parameters are the long-standing backing store for the two 'Digitally sign communications (always)' security options and are read by the SMB redirector/server directly, so this is effective on Windows 10 and on Home, not just where the 24H2 management surface exists. On the author's open question (is the 24H2 'required' default stored as a registry value?): it does not matter for correctness. Deleting the value hands control back to the OS default in both directions — 'required' on 24H2 Pro/Enterprise/Education, 'not required' on Windows 10 and Home — which is exactly what the docs claim and is strictly safer than writing 0 on revert. So deleteOnRevert is the right choice, and the residual uncertainty is not a defect. UNSAFE: significant but correctly scoped functionality loss (consumer NAS and router USB shares that rely on guest access become unreachable). It does not break boot, login, patching, or any security control — it strengthens one. The name carries the '(breaks unsigned NAS and guest shares)' warning, matching the catalog convention already used at windows.yaml:13877 ('Disable hidden remote file access via administrative shares (breaks remote system management software)'). BROKEN CODE: compiled clean at 28/32-space indentation under `category: Enable secure connections` (windows.yaml:13622); two SetRegistryValue calls plus ShowComputerRestartSuggestion, declared parameters only. recommend strict confirmed — this must not be in the standard preset.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview`
  - `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing`
  - `https://techcommunity.microsoft.com/blog/filecab/accessing-a-third-party-nas-with-smb-in-windows-11-24h2-may-fail/4154300`

```yaml
                            -
                                name: Enable required SMB signing (breaks unsigned NAS and guest shares)
                                recommend: strict # Blocks third-party SMB servers without signing and disables guest share access
                                docs: |- # refactor-with-variables: Same • Compatibility Caution
                                    This script requires every file-sharing connection to be digitally signed.

                                    **SMB** is the protocol Windows uses for file and printer sharing. **SMB
                                    signing** adds a signature that contains a hash of the whole message and
                                    the identities of sender and receiver [1]. If someone changes the message
                                    on the way, the signature no longer matches, so tampering and relay
                                    attacks are detected and refused [1].

                                    Windows supports signing in every version, but only requires it in newer
                                    ones. Windows 11, version 24H2 Enterprise, Pro and Education require it
                                    for both outgoing and incoming connections, while Windows 11, version
                                    24H2 Home requires neither [2]. Windows 10 requires neither. This script
                                    applies the newer, stricter behaviour everywhere.

                                    ### Technical details

                                    The script sets both documented values to `1` [1]:

                                    - `HKLM\SYSTEM\CurrentControlSet\Services\LanManWorkstation\Parameters!RequireSecuritySignature`
                                      for outgoing connections.
                                    - `HKLM\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters!RequireSecuritySignature`
                                      for incoming connections.

                                    Reverting deletes both values instead of writing `0`. On a clean system
                                    the values are absent and the operating system applies its own default,
                                    which is "required" on Windows 11, version 24H2 Pro, Enterprise and
                                    Education and "not required" on Windows 10 and Windows 11 Home [2].
                                    Deleting therefore restores the real default of your Windows version
                                    rather than forcing the weaker setting.

                                    Microsoft notes that the older `EnableSecuritySignature` value only
                                    affects SMB1 and is ignored by SMB2 and later, so this script does not
                                    touch it [1].

                                    > **Caution:**
                                    > - Connections to third-party SMB servers that do not support signing
                                    >   fail with `STATUS_INVALID_SIGNATURE` (`0xc000a000`) [2].
                                    > - Requiring signing also turns off guest access to shares [2]. Many
                                    >   consumer network drives and router USB shares rely on guest access
                                    >   and then report error `0x80070035` [2].
                                    > - Signing costs processing time, so large transfers can be slower.
                                    > - The change needs a restart.
                                    > - Microsoft advises fixing the other side rather than removing the
                                    >   requirement [2].

                                    If you do not run this script, Windows 10 and Windows 11 Home keep
                                    accepting unsigned file-sharing traffic.

                                    [1]: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview "Overview of Server Message Block signing | Microsoft Learn"
                                    [2]: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing "Control SMB signing behavior | Microsoft Learn"
                                call:
                                    -
                                        function: SetRegistryValue
                                        parameters:
                                            keyPath: HKLM\SYSTEM\CurrentControlSet\Services\LanManWorkstation\Parameters
                                            valueName: RequireSecuritySignature
                                            dataType: REG_DWORD
                                            data: "1"
                                            deleteOnRevert: 'true' # Absent by default; the OS default is "required" on Windows 11 24H2 Pro/Enterprise/Education
                                    -
                                        function: SetRegistryValue
                                        parameters:
                                            keyPath: HKLM\SYSTEM\CurrentControlSet\Services\LanManServer\Parameters
                                            valueName: RequireSecuritySignature
                                            dataType: REG_DWORD
                                            data: "1"
                                            deleteOnRevert: 'true' # Absent by default; the OS default is "required" on Windows 11 24H2 Pro/Enterprise/Education
                                    -
                                        function: ShowComputerRestartSuggestion
```

#### Disable NTLM authentication for outgoing SMB connections

- **Category:** Security improvements > Improve network security > Disable insecure connections > Disable insecure protocols
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11, version 24H2 or later, and Windows Server 2025 or later, all editions (the SMB client is present on every SKU). Detected at runtime, so the script is a documented no-op on Windows 10 22H2 and earlier Windows 11 builds. I deliberately used the documented cmdlet instead of the LanmanWorkstation policy value because I could not confirm the registry value name from a Microsoft source.
- **Benefit:** Makes the SMB client refuse to use NTLM for outbound connections, so an attacker cannot trick your computer into sending NTLM credential material to a server they control. This kills the whole class of coerced-authentication and pass-the-hash attacks that start with a UNC path pointing at a hostile host, and forces Kerberos instead.
- **Side effects:** Connections to SMB servers that cannot use Kerberos stop working: NAS devices, Samba servers not joined to a domain, and any share reached by IP address rather than by name. Requires Windows 11 24H2 or Windows Server 2025; the script detects the missing parameter and exits without error on earlier versions. An exception list exists but only through Group Policy, not PowerShell.
- **Vetting note:** DUPLICATE: grep BlockNTLM, SmbClientConfiguration => 0 hits; distinct from LmCompatibilityLevel=5 at windows.yaml:13551 (which still permits NTLMv2) and from proposal 3's BlockNtlmv1SSO. New. OBSOLETE/INEFFECTIVE: verified against `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-ntlm-blocking.` Confirmed the exact cmdlet the script calls — "Set-SmbClientConfiguration -BlockNTLM $true" — and the prerequisites: "Windows Server 2025 or later" / "Windows 11, version 24H2 or later" plus "An SMB server that allows using Kerberos". Confirmed the exception-list limitation the docs claim: "There isn't currently a PowerShell equivalent to the Block NTLM Server Exception List Group Policy object." I deliberately checked that the author's choice of the cmdlet over a guessed registry value was sound — it is, and it is the only documented local method besides Group Policy. UNSAFE: this is the most destructive proposal in the batch on a typical home machine — a workgroup PC has no Kerberos KDC, so most or all outbound SMB stops working, not merely 'many network drives'. That is acceptable only because `recommend` is omitted, so it enters no preset. It does not touch boot, login, updates, or a security control, and revert restores the documented default ($false). The docs' phrasing ('Connections to file servers that cannot use Kerberos stop working. This includes many network drives and Samba servers that are not joined to a directory') is softer than reality for a domain-less home network; a maintainer may want to state that bluntly, but it is a wording weakness, not a correctness or safety defect, and Microsoft does note PKU2U as an alternative so a flat 'all SMB breaks' would also be inaccurate. BROKEN CODE: compiled into windows.yaml at 36/40-space indentation under `category: Disable insecure protocols` (windows.yaml:13137) — integration test passes. Dumped the generated batch: the runtime capability probe `$command.Parameters.Keys.Contains('BlockNTLM')` is exactly the pattern the catalog's own SetMpPreference helper uses (windows.yaml:43208), so pre-24H2 systems get a clean Write-Host + Exit 0 instead of an error; `-Force` is a valid Set-SmbClientConfiguration parameter; no locale strings are parsed and no paths are involved. correctedRecommend 'none' makes the proposal's own omission explicit.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-ntlm-blocking`
  - `https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview`

```yaml
                                    -
                                        name: Disable NTLM authentication for outgoing SMB connections
                                        docs: |- # refactor-with-variables: Same • Compatibility Caution
                                            This script stops the file-sharing client from using NTLM when it
                                            connects to other computers.

                                            **NTLM** is an old authentication protocol. When your computer
                                            opens a network share, it can be tricked into sending NTLM
                                            credential material to whatever server the address points to. An
                                            attacker who receives it can crack it or pass it on to another
                                            service to act as you [1]. A single link or document that points
                                            at a hostile address is enough to start this.

                                            Windows 11, version 24H2 and Windows Server 2025 added the option
                                            to block NTLM for outgoing SMB connections, so the client only
                                            uses `Kerberos` or `PKU2U` [1]. This is separate from disabling
                                            NTLM on the whole system, so it can be applied without turning
                                            off NTLM everywhere [1].

                                            ### Technical details

                                            The script runs `Set-SmbClientConfiguration -BlockNTLM $true`,
                                            the command Microsoft documents for this setting [1]. Reverting
                                            runs the same command with `$false`, which is the documented
                                            default. On Windows versions that do not support the setting, the
                                            script reports this and exits without changing anything.

                                            > **Caution:**
                                            > - Connections to file servers that cannot use `Kerberos` stop
                                            >   working. This includes many network drives and `Samba`
                                            >   servers that are not joined to a directory [1].
                                            > - Connecting to a share by IP address uses NTLM, so those
                                            >   connections also stop working [1].
                                            > - Microsoft offers an exception list for single servers, but
                                            >   only through Group Policy, not through this command [1].

                                            If you do not run this script, the file-sharing client keeps
                                            falling back to NTLM and can be led into sending credential
                                            material to an attacker.

                                            [1]: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-ntlm-blocking "Block NTLM connections on SMB | Microsoft Learn"
                                        call:
                                            function: RunPowerShell
                                            parameters:
                                                codeComment: Block NTLM authentication for outgoing SMB connections
                                                revertCodeComment: Allow NTLM authentication for outgoing SMB connections again
                                                code: |-
                                                    $command = Get-Command 'Set-SmbClientConfiguration' -ErrorAction SilentlyContinue
                                                    if (-Not $command) {
                                                        Write-Warning 'Skipping, the "Set-SmbClientConfiguration" command is not available on this system.'
                                                        Exit 0
                                                    }
                                                    if (-Not $command.Parameters.Keys.Contains('BlockNTLM')) {
                                                        Write-Host 'Skipping, blocking NTLM for SMB needs Windows 11, version 24H2 or later.'
                                                        Exit 0
                                                    }
                                                    try {
                                                        Set-SmbClientConfiguration -BlockNTLM $true -Force -ErrorAction Stop
                                                        Write-Host 'Successfully blocked NTLM authentication for outgoing SMB connections.'
                                                    } catch {
                                                        Write-Warning "Could not block NTLM authentication for outgoing SMB connections: $($_.Exception.Message)"
                                                    }
                                                revertCode: |-
                                                    $command = Get-Command 'Set-SmbClientConfiguration' -ErrorAction SilentlyContinue
                                                    if (-Not $command) {
                                                        Write-Warning 'Skipping, the "Set-SmbClientConfiguration" command is not available on this system.'
                                                        Exit 0
                                                    }
                                                    if (-Not $command.Parameters.Keys.Contains('BlockNTLM')) {
                                                        Write-Host 'Skipping, this system does not support blocking NTLM for SMB.'
                                                        Exit 0
                                                    }
                                                    try {
                                                        Set-SmbClientConfiguration -BlockNTLM $false -Force -ErrorAction Stop
                                                        Write-Host 'Successfully restored the default, NTLM authentication is allowed for outgoing SMB connections.'
                                                    } catch {
                                                        Write-Warning "Could not restore the default for NTLM authentication over SMB: $($_.Exception.Message)"
                                                    }
```

#### Disable remote connections to the print spooler

- **Category:** Security improvements > Improve network security > Disable insecure remote administration access
- **Recommendation:** `strict`
- **Applies to:** Windows 10, version 2004 with KB5005101 and later, and Windows 11 21H2 and later. Policy CSP lists Pro, Enterprise, Education, IoT Enterprise / IoT Enterprise LTSC; the value is read by spoolsv.exe so it also takes effect on Home, but that is outside Microsoft's documented scope.
- **Benefit:** Makes the Print Spooler stop accepting client connections, which removes the remote RPC surface abused by PrintNightmare (CVE-2021-34527) and the related spooler bugs, and also removes the spooler as a coerced-authentication trigger. Local and USB printing keeps working; only inbound remote printing and printer sharing are dropped, which a personal computer almost never needs.
- **Side effects:** This computer can no longer share its printers, and no other computer can print to it. Existing shares stay defined but stop serving. Printing to network printers and to locally attached printers is unaffected. The Print Spooler service must be restarted (or the computer rebooted) for the change to take effect. Documented for Pro, Enterprise, Education and IoT Enterprise in the Policy CSP.
- **Vetting note:** DUPLICATE: grep Spooler, 'print spooler', RegisterSpoolerRemoteRpcEndPoint => 0 hits anywhere in windows.yaml. New. OBSOLETE/INEFFECTIVE: verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-printing2.` The RegisterSpoolerRemoteRpcEndPoint section confirms every claim verbatim: "This policy controls whether the print spooler will accept client connections. When the policy is unconfigured or enabled, the spooler will always accept client connections. When the policy is disabled, the spooler won't accept client connections nor allow users to share printers. All printers currently shared will continue to be shared. The spooler must be restarted for changes to this policy to take effect." Registry Key Name "Software\Policies\Microsoft\Windows NT\Printers", Registry Value Name "RegisterSpoolerRemoteRpcEndPoint", Friendly Name "Allow Print Spooler to accept client connections", editions Pro/Enterprise/Education/IoT Enterprise, applicable OS Windows 10 2004 with KB5005101 and Windows 11 21H2+ — all matching the proposal's docs and appliesTo, including its honest note that Home is outside Microsoft's documented scope. Data 2 = Disabled is the ADMX disabled-state value and is Microsoft's own published PrintNightmare mitigation. deleteOnRevert restores 'unconfigured', which the doc says behaves as 'always accept' — the correct default. UNSAFE: no. It removes an inbound RPC listener only; local printing and printing to network printers are unaffected (verified against the doc's wording, which limits the effect to client connections and printer sharing). Does not touch boot, login, updates, code signing, or AV. Note the proposal's own docs correctly say the spooler must be restarted and it calls ShowComputerRestartSuggestion, which satisfies that. BROKEN CODE: compiled clean at 28/32-space indentation under `category: Disable insecure remote administration access` (windows.yaml:13752); verified the emitted `reg add` single-quotes the space-containing 'Windows NT\Printers' path. SetRegistryValue + ShowComputerRestartSuggestion, declared parameters only. recommend strict confirmed — losing the ability to share printers is real functionality loss, so not standard.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-printing2`
  - `https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34527`

```yaml
                            -
                                name: Disable remote connections to the print spooler
                                recommend: strict # Stops this computer from sharing printers; local and network printing keep working
                                docs: |-
                                    This script stops the Print Spooler from accepting connections from other
                                    computers.

                                    The **Print Spooler** service normally listens for remote procedure calls
                                    so that other computers can print to shared printers on this computer [1].
                                    That listener has been the entry point for several serious remote
                                    code-execution problems, the best known being `PrintNightmare`
                                    (`CVE-2021-34527`) [2]. It is also a convenient way to make a computer
                                    authenticate to an attacker on demand.

                                    A personal computer almost never needs to share its printers, so turning
                                    the listener off removes the risk at no practical cost.

                                    ### Technical details

                                    The script sets
                                    `HKLM\SOFTWARE\Policies\Microsoft\Windows NT\Printers!RegisterSpoolerRemoteRpcEndPoint`
                                    to `2`, which is the "Disabled" state of the policy "Allow Print Spooler
                                    to accept client connections" [1]. Microsoft documents that when the
                                    policy is not configured or enabled the spooler always accepts client
                                    connections, and when it is disabled the spooler accepts no client
                                    connections and does not let users share printers [1].

                                    > **Caution:**
                                    > - This computer can no longer share printers, and other computers can
                                    >   no longer print to it [1].
                                    > - Printing to your own printers and to printers on the network is not
                                    >   affected.
                                    > - The Print Spooler service must be restarted for the change to take
                                    >   effect [1].
                                    > - Microsoft documents the policy for Pro, Enterprise, Education and IoT
                                    >   Enterprise editions [1].

                                    If you do not run this script, the Print Spooler keeps listening for
                                    connections from other computers.

                                    [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-printing2 "ADMX_Printing2 Policy CSP - RegisterSpoolerRemoteRpcEndPoint | Microsoft Learn"
                                    [2]: https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34527 "Windows Print Spooler Remote Code Execution Vulnerability (CVE-2021-34527) | Microsoft Security Response Center"
                                call:
                                    -
                                        function: SetRegistryValue
                                        parameters:
                                            keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows NT\Printers
                                            valueName: RegisterSpoolerRemoteRpcEndPoint
                                            dataType: REG_DWORD
                                            data: "2" # 1: Enabled (accept client connections), 2: Disabled
                                            deleteOnRevert: 'true' # Missing by default; absence means the spooler always accepts client connections
                                    -
                                        function: ShowComputerRestartSuggestion
```

#### Disable WebDAV client

- **Category:** Security improvements > Improve network security > Disable non-essential network components
- **Recommendation:** `strict`
- **Applies to:** Windows 10 22H2 and Windows 11, all client editions (the service is not installed on Windows Server by default, and DisableService skips missing services). The default startup type of Manual (Trigger Start) is documented only in third-party service references, not on learn.microsoft.com; a maintainer should confirm with (Get-Service WebClient).StartType on a clean image before merging.
- **Benefit:** Disables the WebClient service, which implements WebDAV. While it runs, Windows falls back from SMB to HTTP for UNC paths such as \\host@80\share, and HTTP authentication has no signing requirement, so credential material can be relayed to other services. Disabling the service removes that fallback entirely and also removes an HTTP-based path for forced authentication (MITRE ATT&CK T1187).
- **Side effects:** WebDAV network drives stop working, and so do SharePoint or OneDrive "Open in Explorer" style flows and any application that maps an HTTP file store as a drive letter. The service is Manual (Trigger Start) by default and is normally stopped, so nothing changes for users who do not use WebDAV. Revert restores the Manual startup type.
- **Vetting note:** DUPLICATE: grep WebClient, webdav => 0 hits in windows.yaml. New. OBSOLETE/INEFFECTIVE: the service still exists and still implements the WebDAV redirector, and I found a first-party source that resolves the author's own stated uncertainty. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features` carries the entry: "Webclient (WebDAV) Service | The Webclient (WebDAV) service is deprecated. The Webclient service isn't started by default in Windows." (announced November 2023). That confirms the service is not Automatic and that Microsoft itself considers it disposable — much stronger than the third-party revertservice.com citation the proposal relied on. UNSAFE: no. Even if the precise default were 'Manual (Trigger Start)' rather than plain 'Manual', the revert is still correct: Set-Service -StartupType Manual restores Manual and the service's start-trigger configuration lives outside the startup type, so trigger start is preserved. Nothing here touches boot, login, updates, code signing or AV; OneDrive does not depend on WebClient. BROKEN CODE: compiled into windows.yaml at 28/32-space indentation under `category: Disable non-essential network components` (windows.yaml:14058) — integration test passes. DisableService parameters match the declaration at windows.yaml:39650 (serviceName / defaultStartupMode with allowed value 'Manual' / ignoreMissingOnRevert). I dumped the generated code and confirmed the helper already guards the not-installed case ('Service "WebClient" could not be not found, no need to disable it'), so it is safe on Windows Server images where the redirector feature is absent. WHY correctedYaml: swaps the third-party `https://revertservice.com/11/webclient/` citation — which the author flagged as unverifiable and which also breaks the catalog's convention of citing non-Microsoft URLs through web.archive.org (629 archived citations vs a handful of bare ones) — for the first-party Microsoft deprecation page, and rewords the default-startup sentence to explain why reverting to plain 'Manual' is correct. The call block is unchanged. recommend strict confirmed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/dd442659(v=ws.10`)
  - `https://attack.mitre.org/techniques/T1187/`
  - `https://revertservice.com/11/webclient/`

```yaml
                            -
                                name: Disable WebDAV client (breaks WebDAV network drives)
                                recommend: strict # Breaks WebDAV drives and "Open in Explorer" flows, otherwise unused on personal computers
                                docs: |-
                                    This script disables the WebDAV client service.

                                    The **WebClient** service adds `WebDAV` support to Windows, so a web
                                    address can be used as a network drive [1]. It is installed on all Windows
                                    client editions and starts on demand. Microsoft has deprecated this
                                    service and states that it "isn't started by default in Windows" [2].

                                    While the service runs, Windows can fall back from file sharing over SMB
                                    to `WebDAV` over HTTP. An address such as `\\host@80\share` therefore
                                    makes Windows authenticate over HTTP instead of SMB. HTTP authentication
                                    has no signing requirement, so the credential material can be forwarded to
                                    another service and used to act as you. This is the *forced
                                    authentication* technique [3].

                                    Disabling the service removes that fallback. Ordinary file sharing over
                                    SMB and normal web browsing are not affected.

                                    ### Technical details

                                    The script disables the `WebClient` service. Its default startup type on
                                    Windows client editions is *Manual (Trigger Start)*, and reverting sets it
                                    back to *Manual*. The service's start triggers are stored separately from
                                    the startup type, so they are not removed.

                                    > **Caution:**
                                    > - `WebDAV` network drives stop working.
                                    > - Features that open a document library as a folder, such as SharePoint
                                    >   "Open in Explorer", stop working [1].
                                    > - Applications that map a web address as a drive letter stop working.

                                    If you do not run this script, the service keeps starting on demand and
                                    Windows keeps its HTTP authentication fallback.

                                    [1]: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/dd442659(v=ws.10) "WebDAV Redirector | Microsoft Learn"
                                    [2]: https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features "Deprecated features in the Windows client | Microsoft Learn"
                                    [3]: https://attack.mitre.org/techniques/T1187/ "Forced Authentication, Technique T1187 | MITRE ATT&CK"
                                call:
                                    function: DisableService
                                    parameters:
                                        serviceName: WebClient # Check: (Get-Service -Name 'WebClient').StartType
                                        defaultStartupMode: Manual # Default: Manual (Trigger Start) on Windows 10 and Windows 11 client editions
                                        ignoreMissingOnRevert: 'true'
```

#### Remove "Quick Assist" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 21H2 and later (incl. 24H2 / 25H2) where Quick Assist ships as a Store app, all SKUs. On Windows 10 the shipped form is the App.Support.QuickAssist Feature on Demand, which the catalog already removes.
- **Benefit:* Removes the preinstalled remote-screen-sharing app that Microsoft itself recommends removing when it is not used, because it lets a remote party take full control of the device and is a standing tech-support-scam vector. Also stops the app's diagnostic traffic to .events.data.microsoft.com, .aria.microsoft.com and .monitor.azure.com.
- **Side effects:** CTRL+Win+Q and the Quick Assist Start entry stop working, so Microsoft Support or an IT helper can no longer connect this way. Fully reinstallable from the Microsoft Store (product 9P7BP5VNWKX5). Does not affect Remote Desktop, Store, Settings, or Windows Update.
- **Vetting note:** NOT A DUPLICATE: grep finds only `capabilityName: App.Support.QuickAssist` (windows.yaml:36682) — the Windows 10 Feature on Demand, not the Store app. `https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#quick-assist` states "Starting with Windows 11 Insider Preview build 22572, Quick Assist is a preinstalled app which is updated through the Microsoft Store. The Quick Assist Feature on Demand is no longer available", so the two entries cover disjoint OS generations. EVERY DOC CLAIM VERIFIED verbatim against `https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist:` uninstall command `Get-AppxPackage -Name MicrosoftCorporationII.QuickAssist | Remove-AppxPackage -AllUsers`; "disable or remove Quick Assist as a best practice, if it isn't used within your environment. This prevents guests from using Quick Assist to gain access to devices"; `CTRL`+`Windows`+`Q`; endpoint table rows `*.aria.microsoft.com`, `*.events.data.microsoft.com` ("Required diagnostic data"), `*.monitor.azure.com` ("Required for telemetry and remote service initialization"); logged data (start/end time, errors, features used) and "Microsoft doesn't store any data about either the sharer or the helper for longer than three days"; Store product 9P7BP5VNWKX5. Package name + publisherId and the 22H2/23H2/24H2 ✅ / Win10 ❌ table match the repo's own inventories (06/07/08-*.txt contain `MicrosoftCorporationII.QuickAssist 8wekyb3d8bbwe Provisioned`; 04-windows-10-22H2 does not). RECOMMEND CORRECTED: `standard` is wrong for an app uninstall — the Standard preset is documented as "Retains functionality of all apps and system services", and all 109 existing store-app removals carry no recommend level. Removing the only inbox path for Microsoft Support to connect must stay opt-in.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist#uninstall-quick-assist`
  - `https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist#network-considerations`
  - `https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#quick-assist`
  - `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal`

```yaml
                    -
                        name: Remove "Quick Assist" app
                        docs: |-
                            This script uninstalls the "Quick Assist" app (package `MicrosoftCorporationII.QuickAssist`).

                            Quick Assist lets another person connect over the internet to view the screen and, after a
                            prompt, take full control of the device [1]. Starting with Windows 11, it is a preinstalled
                            Store app rather than a Feature on Demand [2]. The catalog removes the older Windows 10
                            `App.Support.QuickAssist` capability separately; this script targets the Windows 11 app.

                            Microsoft recommends removing it when it is not used: "If your organization utilizes another
                            remote support tool [...] disable or remove Quick Assist as a best practice, if it isn't used
                            within your environment. This prevents guests from using Quick Assist to gain access to
                            devices" [1]. Microsoft also warns about tech support scams that abuse this exact
                            workflow [1], and lists `QuickAssist` among the preinstalled Store apps administrators may
                            remove [3].

                            The app reaches Microsoft endpoints including `*.events.data.microsoft.com` for "required
                            diagnostic data" and `*.monitor.azure.com` for "telemetry and remote service
                            initialization" [1]. Microsoft logs session start/end times, errors, and which in-app
                            features were used, and keeps the data for up to three days [1].

                            Microsoft documents the removal as
                            `Get-AppxPackage -Name MicrosoftCorporationII.QuickAssist | Remove-AppxPackage -AllUsers` [1],
                            and the app can be reinstalled from the
                            [Microsoft Store](https://apps.microsoft.com/store/detail/quick-assist/9P7BP5VNWKX5) [1].

                            Without this script the app stays installed and can be launched by anyone at the keyboard
                            with `CTRL`+`Windows`+`Q` [1].

                            Removing this app does not affect Remote Desktop, the Microsoft Store, Settings, or Windows
                            Update.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ✅ |
                            | Windows 11 | 23H2 | ✅ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/client-tools/quick-assist "Use Quick Assist to help users | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#quick-assist "Available features on demand - Quick Assist | Microsoft Learn"
                            [3]: https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal "Policy-based in-box app removal | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: MicrosoftCorporationII.QuickAssist # Get-AppxPackage MicrosoftCorporationII.QuickAssist
                                publisherId: 8wekyb3d8bbwe
```

#### Remove "WMIC" capability

- **Category:** Remove bloatware > Remove on-demand capabilities and features > Remove preinstalled features on demand
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 22H2 and 23H2 (preinstalled Feature on Demand), and Windows 11 24H2 / 25H2 machines that were upgraded and still carry it. No-op where the capability is absent. Windows 10 22H2 ships wmic.exe as part of the image, not as a capability, so the script does not change it there.
- **Benefit:** Removes the deprecated WMIC command-line utility, a preinstalled Feature on Demand that Microsoft is retiring and that is a well-known living-off-the-land binary used to enumerate systems and launch code. Microsoft says WMIC "can be reinstalled from optional features or DISM" but that doing so "is not recommended since it will be fully removed in the future".
- **Side effects:** wmic.exe stops working. WMI itself is untouched, and PowerShell's CIM and WMI cmdlets keep providing the same data. Legacy scripts or vendor tools that shell out to wmic.exe would need updating. Reversible with Add-WindowsCapability, which the shared function's revert performs. Already absent on clean Windows 11 24H2 and later installs, where the script is a no-op.
- **Vetting note:* NOT A DUPLICATE: grep for `WMIC` in src/application/collections/ finds only `capabilityName: WMI-SNMP-Provider.Client` (windows.yaml:36238), which is a different capability and — importantly — is not matched by the proposed `Get-WindowsCapability -Online -Name 'WMIC*'` prefix glob (`WMI-` != `WMIC`), so there is no cross-hit. TARGET VERIFIED on `https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#wmic:` "Capability Name: WMIC~~~~", "Availability: Windows 11, version 22H2 and later", and the note "Starting with Windows 11, version 24H2, WMIC is not preinstalled" — so the `WMIC` prefix, the 22H2/23H2 Installed default, and the Windows 10 "not a capability" claim are all correct. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features` additionally confirms "This deprecation applies to only the command-line management utility. WMI itself isn't affected" and "Currently, WMIC is a Feature on Demand (FoD) that's preinstalled by default in Windows 11, versions 23H2 and 22H2." SAFE: does not touch WMI, code signing, updates or any security control; `UninstallCapability` (windows.yaml:38718) declares exactly one parameter, `capabilityName`, which is what is passed, and its revert re-adds via `Add-WindowsCapability`. Indentation 28/32 matches the `Remove preinstalled features on demand` children (category at col 24, `function:` at col 36 per line 36636). RECOMMEND CORRECTED: `standard` overstates safety — removing `wmic.exe` breaks any legacy script or vendor agent that shells out to it, which violates the Standard preset's "Retains functionality of all apps and system services" contract. Of the 50 `UninstallCapability` scripts already in the collection, 49 have no recommend level and 1 is strict; none is standard.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#wmic`
  - `https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#features-removed-in-windows-11-version-25h2`
  - `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features`
  - `https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi`

```yaml
                            -
                                name: Remove "WMIC" capability
                                docs: |-
                                    This script removes the `WMIC` Feature on Demand, the Windows Management Instrumentation
                                    command-line utility (`wmic.exe`).

                                    WMIC is a preinstalled Feature on Demand on Windows 11 version 22H2 and later [1].
                                    Microsoft deprecated it and points to PowerShell for WMI as the replacement, and states
                                    that "This deprecation applies to only the command-line management utility. WMI itself
                                    isn't affected" [3] [4].

                                    Microsoft removed it from newer images: "Starting with Windows 11, version 24H2, WMIC is
                                    not preinstalled" [1], and the utility "is uninstalled when the feature update for
                                    Windows 11, version 25H2 is installed. While WMIC can be reinstalled from optional
                                    features or DISM, it's not recommended since it will be fully removed in the future" [2].

                                    Running this script aligns older and upgraded machines with that default and removes a
                                    binary that is routinely abused to enumerate a system and start processes.

                                    Without this script, `wmic.exe` stays present on Windows 11 version 22H2 and 23H2, and on
                                    machines that carried it through an upgrade.

                                    WMI, and therefore the PowerShell CIM and WMI cmdlets, keep working [4]. The capability
                                    can be added back at any time. On systems where it is already absent, the script makes no
                                    change.

                                    > **Caution:** Legacy scripts, installers, and third-party agents that call `wmic.exe`
                                    > stop working until the capability is added back.

                                    ### Overview of default capability statuses

                                    | | |
                                    | ---- | --- |
                                    | **Capability name**  | `WMIC~~~~` |
                                    | **Display name**  | WMIC |
                                    | **Default** (Windows 11 22H2, 23H2) | 🟢 Installed |
                                    | **Default** (Windows 11 ≥ 24H2, clean install) | 🟡 Not present |
                                    | **Default** (Windows 10 ≥ 22H2) | 🟡 Not a capability (part of the image) |

                                    [1]: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod#wmic "Available features on demand - WMIC | Microsoft Learn"
                                    [2]: https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#features-removed-in-windows-11-version-25h2 "What's new in Windows 11, version 25H2 | Microsoft Learn"
                                    [3]: https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features "Deprecated features in the Windows client | Microsoft Learn"
                                    [4]: https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi "Working with WMI | Microsoft Learn"
                                call:
                                    function: UninstallCapability
                                    parameters:
                                        capabilityName: WMIC
```

### Privacy (12)

#### Disable app access to on-screen text

- **Category:** Disable OS data collection > Disable app access to personal information
- **Recommendation:** `strict`
- **Applies to:** Windows 11 21H2 (build 22000) and later, including 25H2. Pro, Enterprise, Education, IoT Enterprise (Home ignores AppPrivacy policies).
- **Benefit:* Blocks the LetAppsAccessForegroundText app permission, which lets a Windows app read the text content of whatever app is in the foreground - the exact primitive that on-screen AI assistants use. The catalog has ~20 LetAppsAccess entries but zero hits for ForegroundText.
- **Side effects:** Assistive, translation, and screen-reading Store apps that read the foreground window lose that capability. Reverting deletes the policy values (documented default is "User in control").
- **Vetting note:* Duplicate check: grep for LetAppsAccessForegroundText and ForegroundText in src/application/collections/ = 0 hits, while ~20 sibling LetAppsAccess entries exist. Verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-privacy:` LetAppsAccessForegroundText exists, "Windows 11, version 21H2 [10.0.22000] and later", Pro/Enterprise/Education/IoT Enterprise, Device scope, Default Value 0, allowed values 0 (Default) User in control / 1 Force allow / 2 Force deny — exactly what the docs block claims, including the "User in control" default. BlockUWPAccessViaGPO (windows.yaml:41256) declares parameter policyName and writes data '2' (Force deny) plus the three REG_MULTI_SZ exception lists with deleteOnRevert, which matches the documented deny value and the documented absent default. Safe: no update, signing, Defender, boot or login surface. Indentation (20-space list dash, 24-space keys) matches the existing children of "Disable app access to personal information" at windows.yaml:2823. recommend: strict is correct — it keeps this out of the Standard selection because assistive/translation apps lose the capability. Verified by inserting the snippet into a scratch windows.yaml: yamllint clean and the integration test "CompositeApplicationLoader > can parse current application" passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-privacy#letappsaccessforegroundtext`

```yaml
                    -
                        name: Disable app access to on-screen text
                        recommend: strict # refactor-with-variables: Same • App Access Caution
                        docs: |-
                            This script prevents Windows apps from reading the text content of the application in the foreground [1].

                            Windows lets apps request the text that is currently on screen in another app [1]. That text can include messages,
                            documents, and credentials that are visible at the moment of the request, so the permission is a direct route to
                            content the user never handed to the requesting app.

                            This script configures:

                            - Windows policy (`LetAppsAccessForegroundText` [1])

                            The policy applies to Windows 11, version 21H2 and later, on Pro, Enterprise, Education, and IoT Enterprise
                            editions [1]. Without the policy the default is "User in control" [1]. The value does not exist on a default
                            installation, so reverting deletes it.

                            > **Caution:**
                            > Disabling app access may affect the functionality of certain Microsoft Store, third-party, and system applications.
                            > Assistive, translation, and screen-reading apps that read the foreground window lose that capability.

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-privacy#letappsaccessforegroundtext "Privacy Policy CSP - Windows Client Management | Microsoft Learn"
                        call:
                            function: BlockUWPAccessViaGPO
                            parameters:
                                policyName: LetAppsAccessForegroundText
```

#### Disable AI features in Notepad

- **Category:** Disable OS data collection
- **Recommendation:** `strict`
- **Applies to:** Windows 11 22H2 and later (so also 24H2/25H2) with Notepad 11.2503.16.0 or later; older Notepad packages ignore the policy. Machine-wide, no SKU restriction documented for the registry route.
- **Benefit:** Notepad now ships Copilot-powered AI features (Rewrite / Summarize / Write) that process selected text with GPT models and are enabled by default. Microsoft publishes an exact machine-wide registry policy for turning them off, and the catalog has 0 hits for WindowsNotepad / DisableAIFeatures (it covers Paint AI but not Notepad AI).
- **Side effects:** The AI entry points disappear from Notepad for every user on the device. Plain-text editing is unchanged. Reverting deletes the value (Microsoft's documented "not configured" state).
- **Vetting note:** Duplicate check: grep for WindowsNotepad and DisableAIFeatures = 0 hits; the catalog covers Paint AI (windows.yaml:2683) but nothing for Notepad. Verified against `https://learn.microsoft.com/en-us/windows/client-management/manage-notepad`, Registry tab, verbatim: "To disable AI features in Notepad, set the `DisableAIFeatures` registry value to `1` under `HKLM:\SOFTWARE\Policies\WindowsNotepad`." The YAML uses exactly that path, value name, REG_DWORD and data "1". Same page confirms the docs block's other claims verbatim: "Notepad in Windows includes AI features powered by Copilot that help refine and shorten text with the assistance of GPT. By default, these AI features are enabled on managed devices"; "The group policy settings contained in the ADMX file are machine-wide for all users"; supported versions "Windows 11, version 22H2 or later" and "Notepad version 11.2503.16.0 or later"; and "If this policy is disabled or not configured, users can access AI features" — which justifies deleteOnRevert: 'true'. Policy key is created only when configured, so deleting is the right revert. Safe and out of the way of any security control. Indentation (12-space dash, 16-space keys) matches the direct children of "Disable OS data collection" at windows.yaml:2622. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/manage-notepad`

```yaml
            -
                name: Disable AI features in Notepad
                recommend: strict
                docs: |-
                    Notepad includes AI features powered by Copilot that refine and shorten text with the assistance of GPT [1].
                    They are enabled by default [1], which means the text a user selects in a plain-text editor can leave the device.

                    This script enables the documented `DisableAIFeaturesInNotepad` policy. Users can then no longer access the AI
                    features in Notepad [1], while ordinary text editing stays unchanged. The policy is machine-wide for all users [1].

                    The policy requires Windows 11, version 22H2 or later, and Notepad version 11.2503.16.0 or later [1].
                    Older Notepad builds ignore it. The value does not exist on a default installation, so reverting deletes it.

                    [1]: https://learn.microsoft.com/en-us/windows/client-management/manage-notepad "Manage AI features in Notepad | Microsoft Learn"
                call:
                    function: SetRegistryValue
                    parameters:
                        keyPath: HKLM\SOFTWARE\Policies\WindowsNotepad
                        valueName: DisableAIFeatures
                        dataType: REG_DWORD
                        data: "1"
                        deleteOnRevert: 'true' # Missing by default (policy key is created only when the policy is configured)
```

#### Disable AI agent in Windows Settings

- **Category:** Disable OS data collection
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 24H2 with KB5062660 and later (incl. 25H2), Copilot+ PCs only. Microsoft lists the policy for Enterprise, Education, and IoT Enterprise editions - Pro is marked unsupported, so it may be ignored there. Writing the value is harmless on unaffected devices.
- **Benefit:** The "agent in Settings" (25H2, KB5062660) runs the local Settings Mu model over everything the user types into Settings search and can automate settings changes on request. Microsoft documents a dedicated policy for turning it off; the catalog has 0 hits for DisableSettingsAgent.
- **Side effects:** Settings search falls back to static and semantic indexed results; the agent can no longer recommend or apply settings changes. Reverting deletes the value.
- **Vetting note:** Duplicate check: grep DisableSettingsAgent = 0 hits (the catalog has AllowRecallEnablement, DisableAIDataAnalysis, DisableClickToDo under the same WindowsAI key, but not this). Verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-windowsai:` DisableSettingsAgent, Group policy mapping "Registry Key Name: SOFTWARE\Policies\Microsoft\Windows\WindowsAI", "Registry Value Name: DisableSettingsAgent", Default Value 0, "1 | Settings Agentic search experience isn't enabled", editions Pro ❌ / Enterprise ✅ / Education ✅ / IoT Enterprise ✅ — matching the proposal's edition claim. `https://learn.microsoft.com/en-us/windows/configuration/settings/agent` confirms the rest verbatim: "Starting in Windows 11, version 24H2 with KB5062660", requirements "A Copilot+ PC", the local model "Settings Mu", and "When the policy setting is enabled, the agent experience isn't available, and search results are limited to statically indexed searches and semantic searches." Default is not-configured, so deleteOnRevert: 'true' restores the correct default. Caveat noted and accepted: the WindowsAI CSP page still tags this policy's Applicable OS as "Windows Insider Preview" and warns those settings are under development — but the registry mapping is published, the value is inert where unsupported, and the catalog already ships DisableClickToDo under the same Insider tag. recommend is already null (none), which correctly reflects that this is opinionated rather than universally safe. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/configuration/settings/agent`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-windowsai#disablesettingsagent`

```yaml
            -
                name: Disable AI agent in Windows Settings
                docs: |-
                    Starting with Windows 11, version 24H2 with KB5062660, the Settings app includes an agent that uses on-device AI
                    to find and change settings, to troubleshoot, and to automate tasks based on what the user types [1]. It sends the
                    query to a local language model called Settings Mu [1], and it can change settings once the user agrees [1].

                    This script enables the `DisableSettingsAgent` policy. Settings search then returns only statically indexed and
                    semantic results, and the agent experience is no longer available [1] [2].

                    Microsoft documents this policy for Enterprise, Education, and IoT Enterprise editions [2], and the agent itself
                    only appears on Copilot+ PCs [1]. On other editions and devices the value has no effect. The value does not exist
                    on a default installation, so reverting deletes it [2].

                    [1]: https://learn.microsoft.com/en-us/windows/configuration/settings/agent "Configure the agent in Windows Settings | Microsoft Learn"
                    [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-windowsai#disablesettingsagent "WindowsAI Policy CSP | Microsoft Learn"
                call:
                    function: SetRegistryValue
                    parameters:
                        keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsAI
                        valueName: DisableSettingsAgent
                        dataType: REG_DWORD
                        data: "1"
                        deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean installation
```

#### Minimize diagnostic log and crash dump collection

- **Category:** Disable OS data collection > Disable Windows telemetry and data collection
- **Recommendation:** `standard`
- **Applies to:** Windows 11 21H2 (build 22000) and later, incl. 24H2/25H2. Pro, Enterprise, Education, IoT Enterprise; Home ignores DataCollection policies.
- **Benefit:** Two documented DataCollection policies the catalog does not have (0 hits for LimitDumpCollection / LimitDiagnosticLogCollection): they stop Microsoft from pulling extra diagnostic log files and full/heap memory dumps from the device. Memory dumps are the highest-sensitivity telemetry artifact - they can contain document, message, and credential fragments. Useful defense in depth if optional diagnostic data ever gets re-enabled by an upgrade or by a user.
- **Side effects:** Microsoft loses the ability to diagnose some crashes on the device. Windows Error Reporting still sends kernel mini dumps and user-mode triage dumps. Locally written crash dumps and local troubleshooting are unaffected. No user-visible behavior change.
- **Vetting note:** Duplicate check: grep LimitDumpCollection and LimitDiagnosticLogCollection = 0 hits. Verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-system.` LimitDiagnosticLogCollection: "Windows 11, version 21H2 [10.0.22000] and later", Pro/Enterprise/Education/IoT Enterprise, Default Value 0, "0 (Default) Disabled / 1 Enabled", Registry Key Name "Software\Policies\Microsoft\Windows\DataCollection" — matches the proposal's HKLM path and data "1". LimitDumpCollection: identical OS/editions/default/key, and the doc text backs the docs block almost word for word: "By enabling this setting, Windows Error Reporting is limited to sending kernel mini dumps and user mode triage dumps" and "If you disable or don't configure this policy setting, we may occasionally collect full or heap dumps if the user has opted to send optional diagnostic data." So the quoted "may occasionally" and the kernel-mini-dump caveat in sideEffects are accurate, as is the admission that this only bites when optional diagnostic data is on (defense in depth). Both values absent by default, so deleteOnRevert: 'true' is the correct revert. No user-visible change and no security control touched, so recommend: standard is not overstating safety. Indentation matches the children of "Disable Windows telemetry and data collection" at windows.yaml:5233. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-system#limitdiagnosticlogcollection`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-system#limitdumpcollection`

```yaml
                    -
                        name: Minimize diagnostic log and crash dump collection
                        recommend: standard
                        docs: |-
                            When a device is configured to send optional diagnostic data, Microsoft can additionally collect diagnostic log
                            files from the device [1] and full or heap memory dumps through Windows Error Reporting [2]. A full or heap dump
                            can contain fragments of any document, message, password, or key that was in memory when the problem occurred.

                            This script enables two documented policies:

                            - `LimitDiagnosticLogCollection` stops the collection of the additional diagnostic logs [1].
                            - `LimitDumpCollection` limits Windows Error Reporting to kernel mini dumps and user-mode triage dumps, so full
                              and heap dumps are not collected [2].

                            Both policies apply to Windows 11, version 21H2 and later, on Pro, Enterprise, Education, and IoT Enterprise
                            editions [1] [2]; Home editions ignore them. Without the policies, Microsoft "may occasionally" collect these
                            logs and dumps from devices that send optional diagnostic data [1] [2]. Locally written crash dumps and local
                            troubleshooting are not affected. Neither value exists on a default installation, so reverting deletes them.

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-system#limitdiagnosticlogcollection "System Policy CSP | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-system#limitdumpcollection "System Policy CSP | Microsoft Learn"
                        call:
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection
                                    valueName: LimitDiagnosticLogCollection
                                    dataType: REG_DWORD
                                    data: "1"
                                    deleteOnRevert: 'true' # Missing by default, policy default is "Disabled" (0)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection
                                    valueName: LimitDumpCollection
                                    dataType: REG_DWORD
                                    data: "1"
                                    deleteOnRevert: 'true' # Missing by default, policy default is "Disabled" (0)
```

#### Disable Microsoft 365 Apps diagnostic data

- **Category:** Configure programs > Disable Microsoft Office telemetry
- **Recommendation:** `standard`
- **Applies to:** Microsoft 365 Apps for enterprise/business version 1904 or later, plus subscription Project and Visio, on Windows 10 22H2 / Windows 11 all versions. Perpetual Office 2016 is unaffected.
- **Benefit:** The catalog's Office telemetry scripts only touch the legacy Office\Common\ClientTelemetry and OSM keys. The modern, Microsoft-documented control for Microsoft 365 Apps (version 1904+) is the SendTelemetry policy under Software\Policies\Microsoft\office\common\clienttelemetry - 0 hits in the catalog. Setting it to "Neither" stops all client diagnostic data, including the optional data Microsoft says is used in aggregate to train machine-learning experiences.
- **Side effects:** Microsoft cannot diagnose Office client problems on the device. Required service data (licensing, connected experiences) is still sent. No user-visible feature loss.
- **Vetting note:** Duplicate check: the only pre-existing SendTelemetry hit is the unrelated valueName SendTelemetryData at windows.yaml:8817; the catalog's Office telemetry scripts (windows.yaml:9165-9220) touch only HKCU\SOFTWARE\Microsoft\Office[\<ver>]\Common\ClientTelemetry!DisableTelemetry and !VerboseLogging, i.e. the legacy non-policy keys. Zero hits for the Policies\...\office\common\clienttelemetry path. Verified against `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls`, "Control privacy settings by editing the registry": table row "Configure the level of client software diagnostic data sent by Office to Microsoft | SendTelemetry | 1=Required 2=Optional 3=Neither", and the sample .reg puts it under [HKEY_CURRENT_USER\Software\Policies\Microsoft\office\common\clienttelemetry] as "sendtelemetry"=dword — exactly the proposal's path, value name, type and data "3". Same page confirms the docs block: "Starting with Version 1904 of Microsoft 365 Apps for enterprise"; "If you disable or don't configure this policy setting, both optional and required diagnostic data are sent to Microsoft" (justifies deleteOnRevert); "Even if you choose Neither, required service data will be sent"; "These new policy settings also apply to the desktop versions of Project and Visio"; and the Optional level "may also be used in aggregate to train and improve experiences powered by machine learning, such as recommended actions, text predictions, and contextual help." No feature loss for the user, so recommend: standard is justified. HKCU writes have precedent in this same category. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls`

```yaml
                    -
                        name: Disable Microsoft 365 Apps diagnostic data
                        recommend: standard
                        docs: |-
                            Microsoft 365 Apps send required and optional diagnostic data about the Office client software to Microsoft [1].
                            Optional diagnostic data may also be used in aggregate to train and improve machine-learning experiences such as
                            recommended actions, text predictions, and contextual help [1]. If no policy is configured, both required and
                            optional diagnostic data are sent [1].

                            This script sets the documented *Configure the level of client software diagnostic data sent by Office to
                            Microsoft* policy (`SendTelemetry`) to **Neither**, so no diagnostic data about the Office client software is
                            sent from the device [1]. Required service data, which keeps licensing and connected experiences working,
                            is still sent [1].

                            The policy needs Microsoft 365 Apps for enterprise or business, version 1904 or later [1]. It also applies to the
                            subscription versions of Project and Visio [1]. It complements, and does not replace, the older `ClientTelemetry`
                            settings. The value does not exist on a default installation, so reverting deletes it.

                            [1]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls "Use policy settings to manage privacy controls for Microsoft 365 Apps for enterprise | Microsoft Learn"
                        call:
                            function: SetRegistryValue
                            parameters:
                                keyPath: HKCU\Software\Policies\Microsoft\office\common\clienttelemetry
                                valueName: sendtelemetry
                                dataType: REG_DWORD
                                data: "3"
                                deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean Office installation
```

#### Disable Microsoft Office optional connected experiences

- **Category:** Configure programs > Disable Microsoft Office telemetry
- **Recommendation:** `strict`
- **Applies to:** Microsoft 365 Apps version 1904 or later (Windows 10 22H2, Windows 11 incl. 25H2). Applies per user; the policy key is read by the Office client regardless of Windows SKU.
- **Benefit:** Optional connected experiences are Bing-backed cloud features offered to the user directly, outside an organization's commercial agreement and governed by the Microsoft Services Agreement, sometimes with third-party terms. Disabling them also stops the required service data for those features. The catalog has no entry for the Software\Policies\Microsoft\office\16.0\common\privacy key (0 hits).
- **Side effects:** Features such as "Insert Online Pictures" and Excel 3D Maps stop working (greyed out or error). Coauthoring, online file storage, and the rest of Office keep working. Does not cover LinkedIn-connected experiences. Reverting deletes the value.
- **Vetting note:** Duplicate check: grep ControllerConnectedServicesEnabled = 0 hits; grep for Policies\Microsoft\office in windows.yaml returns only the unrelated Outlook NewOutlookMigrationUserSetting entries (lines 37960, 37985), so the office\16.0\common\privacy policy key is untouched. Verified against `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls` registry table: "Allow the use of additional optional connected experiences in Office | ControllerConnectedServicesEnabled | 1=Enabled 2=Disabled", with the sample .reg placing it under [HKEY_CURRENT_USER\Software\Policies\Microsoft\office\16.0\common\privacy] as "controllerconnectedservicesenabled"=dword — exactly the proposal's path, value name and data "2". The docs block's licensing claim is near-verbatim from that page: "Optional connected experiences are offered by Microsoft directly to your users and are governed by the Microsoft Services Agreement instead of the Microsoft Product Terms. In some cases, third-party content or functionality are provided through these optional connected experiences"; the 3D Maps/Bing example, the "If you don't configure this policy setting, these optional connected experiences will be available" default (justifying deleteOnRevert), the Insert Online Pictures breakage, and the LinkedIn exclusion are all stated on the page. Coauthoring and online file storage are only turned off by the broader "Allow the use of connected experiences in Office" policy, which this script does not set, so the sideEffects claim holds. recommend: strict is correct given the greyed-out commands. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls`
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/optional-connected-experiences`

```yaml
                    -
                        name: Disable Microsoft Office optional connected experiences
                        recommend: strict
                        docs: |-
                            Optional connected experiences are cloud features that Microsoft offers directly to the user inside Office, such as
                            3D Maps in Excel or "Insert Online Pictures", both powered by Bing [1] [2]. Microsoft documents that they are not
                            covered by an organization's commercial agreement and are governed by the Microsoft Services Agreement instead of the
                            Microsoft Product Terms, and that third-party content or functionality can be delivered through them [1]. If no
                            policy is configured, they are available [1].

                            This script disables the documented *Allow the use of additional optional connected experiences in Office* policy
                            (`ControllerConnectedServicesEnabled`). The commands for these features are then greyed out and no required service
                            data for them is sent to Microsoft [1]. Coauthoring, online file storage, and the rest of Office are not affected [1].

                            The policy needs Microsoft 365 Apps version 1904 or later [1]. It does not control experiences that connect a
                            LinkedIn account [1]. The value does not exist on a default installation, so reverting deletes it.

                            > **Caution:**
                            > Features such as "Insert Online Pictures" and Excel 3D Maps stop working.

                            [1]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls "Use policy settings to manage privacy controls for Microsoft 365 Apps for enterprise | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/optional-connected-experiences "Overview of optional connected experiences in Office | Microsoft Learn"
                        call:
                            function: SetRegistryValue
                            parameters:
                                keyPath: HKCU\Software\Policies\Microsoft\office\16.0\common\privacy
                                valueName: controllerconnectedservicesenabled
                                dataType: REG_DWORD
                                data: "2"
                                deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean Office installation
```

#### Disable Microsoft Office connected experiences that analyze content

- **Category:** Configure programs > Disable Microsoft Office telemetry
- **Recommendation:** `strict`
- **Applies to:** Microsoft 365 Apps version 1904 or later (Windows 10 22H2, Windows 11 incl. 25H2). Per user.
- **Benefit:** This is the policy that governs Office features which upload document content for analysis (PowerPoint Designer, Translator, Smart Lookup, and the AI/Copilot class of authoring help). It is the closest documented, reversible local control over "Copilot in Office" data flow, and the catalog has nothing under the office privacy policy key.
- **Side effects:** Cloud-backed authoring help stops being available: PowerPoint Designer, Translator, Smart Lookup, the online parts of Editor, and content-analysis-dependent AI features. Coauthoring and online file storage still work. Reverting deletes the value.
- **Vetting note:** Duplicate check: grep UserContentDisabled = 0 hits, office privacy policy key untouched (see previous entry). Verified against `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls` registry table: "Allow the use of connected experiences in Office that analyze content | UserContentDisabled | 1=Enabled 2=Disabled", under [HKEY_CURRENT_USER\Software\Policies\Microsoft\office\16.0\common\privacy] as "usercontentdisabled"=dword — matches path, value name, type and data "2". The page's own description matches the docs block: "These are experiences that use your Office content to provide you with design recommendations, editing suggestions, data insights, and similar features. For example, PowerPoint Designer or Translator"; "If you don't configure this policy setting, these connected experiences will be available to your users" (justifies deleteOnRevert); "either the ribbon or menu command for those connected experiences will be grayed out or users will get an error message... no required service data for those connected experiences will be sent to Microsoft." The Copilot claim is also faithfully hedged: the page's note attaches the Copilot-unavailable consequence to the broader "Allow the use of connected experiences in Office" policy, and the docs block says exactly that and states it configures only the content-analysis policy. recommend: strict is correct. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls`
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/connected-experiences`

```yaml
                    -
                        name: Disable Microsoft Office connected experiences that analyze content
                        recommend: strict
                        docs: |-
                            Some connected experiences in Office send the content of documents to Microsoft's cloud to produce design
                            recommendations, editing suggestions, and data insights [1]. PowerPoint Designer, Translator, and Smart Lookup are
                            examples [1] [2]. If no policy is configured, these experiences are available and the content they analyze leaves
                            the device [1].

                            This script disables the documented *Allow the use of connected experiences in Office that analyze content* policy
                            (`UserContentDisabled`). The affected commands are then greyed out or return an error, and no required service data
                            for them is sent to Microsoft [1].

                            Microsoft documents Copilot in Office as a connected experience and notes that disabling the broader *Allow the use
                            of connected experiences in Office* policy makes Microsoft Copilot features unavailable in certain apps [1]; this
                            script configures only the content-analysis policy and leaves coauthoring and online file storage working.

                            The policy needs Microsoft 365 Apps version 1904 or later [1]. The value does not exist on a default installation,
                            so reverting deletes it.

                            > **Caution:**
                            > Cloud-backed authoring help such as PowerPoint Designer, Translator, Smart Lookup, and the online parts of Editor
                            > stop being available.

                            [1]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls "Use policy settings to manage privacy controls for Microsoft 365 Apps for enterprise | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/connected-experiences "Connected experiences in Office | Microsoft Learn"
                        call:
                            function: SetRegistryValue
                            parameters:
                                keyPath: HKCU\Software\Policies\Microsoft\office\16.0\common\privacy
                                valueName: usercontentdisabled
                                dataType: REG_DWORD
                                data: "2"
                                deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean Office installation
```

#### Disable Microsoft Office connected experiences that download online content

- **Category:** Configure programs > Disable Microsoft Office telemetry
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Microsoft 365 Apps version 1904 or later (Windows 10 22H2, Windows 11 incl. 25H2). Per user.
- **Benefit:** Stops Office from querying Microsoft's online catalogs for templates, stock images, 3D models, videos, and reference material - each request reveals what the user is working on. Documented policy, and no entry exists in the catalog.
- **Side effects:** Online template gallery, stock images, online 3D models, and PowerPoint QuickStarter become unavailable; locally installed templates still work. Opinionated enough that no recommendation level is set.
- **Vetting note:** Duplicate check: grep DownloadContentDisabled = 0 hits, office privacy policy key untouched. Verified against `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls` registry table: "Allow the use of connected experiences in Office that download online content | DownloadContentDisabled | 1=Enabled 2=Disabled", under [HKEY_CURRENT_USER\Software\Policies\Microsoft\office\16.0\common\privacy] as "downloadcontentdisabled"=dword — matches path, value name, type and data "2". Page text supports the docs block: "These are experiences that allow you to search and download online content including templates, images, 3D models, videos, and reference materials... For example, Office templates or PowerPoint QuickStarter"; not-configured default = available (justifies deleteOnRevert); greyed-out/error behavior and no required service data. Note the page explicitly says this policy also kills Insert Online Pictures even when optional connected experiences are allowed, which the sideEffects list is consistent with. recommend is already null (none), correct for a change that removes the whole online template gallery. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls`
  - `https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/connected-experiences`

```yaml
                    -
                        name: Disable Microsoft Office connected experiences that download online content
                        docs: |-
                            These connected experiences let Office search for and download online content such as templates, images, 3D models,
                            videos, and reference material [1] [2]. Office templates and PowerPoint QuickStarter are examples [1]. Every search
                            and download tells Microsoft what the user is working on. If no policy is configured, these experiences are
                            available [1].

                            This script disables the documented *Allow the use of connected experiences in Office that download online content*
                            policy (`DownloadContentDisabled`). The affected commands are then greyed out or return an error, and no required
                            service data for them is sent to Microsoft [1].

                            The policy needs Microsoft 365 Apps version 1904 or later [1]. The value does not exist on a default installation,
                            so reverting deletes it.

                            > **Caution:**
                            > The online template gallery, stock images, online 3D models, and PowerPoint QuickStarter stop being available.
                            > Locally installed templates are not affected.

                            [1]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/manage-privacy-controls "Use policy settings to manage privacy controls for Microsoft 365 Apps for enterprise | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/microsoft-365-apps/privacy/connected-experiences "Connected experiences in Office | Microsoft Learn"
                        call:
                            function: SetRegistryValue
                            parameters:
                                keyPath: HKCU\Software\Policies\Microsoft\office\16.0\common\privacy
                                valueName: downloadcontentdisabled
                                dataType: REG_DWORD
                                data: "2"
                                deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean Office installation
```

#### Disable phone and PC linking (breaks Phone Link)

- **Category:** Disable OS data collection
- **Recommendation:** `strict`
- **Applies to:** Windows 10 1803 / 22H2 and Windows 11 all versions including 25H2. Pro, Enterprise, Education, IoT Enterprise (Home ignores this policy key).
- **Benefit:** Turns off the OS-level phone-PC link (EnableMmx) that Phone Link, "Link to Windows", "Continue on PC", and the 2025 Cross Device Resume feature are all built on. The catalog removes the Phone Link app and blocks the phone/messaging app permissions, but has 0 hits for EnableMmx / AllowPhonePCLinking, so the OS capability itself is untouched and the app can be reinstalled.
- **Side effects:** Phone Link, "Link to Windows", "Continue on PC", and phone-based resume stop working; the PC removes itself from the linked device list of any phone and must be linked again after reverting. Requires a restart to take effect.
- **Vetting note:** Duplicate check: grep EnableMmx / AllowPhonePCLinking / Mmx = 0 hits. The catalog only removes the app (windows.yaml:32148 'Remove "Phone Link" app', Microsoft.YourPhone) and denies the phoneCall capability (windows.yaml:3363), so the OS-level link is untouched and survives app reinstall — genuinely new. Verified against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity:` AllowPhonePCLinking, "Windows 10, version 1803 [10.0.17134] and later", Pro/Enterprise/Education/IoT Enterprise, Default Value 1, "0 | Don't link", Group policy mapping "Friendly Name: Phone-PC linking on this device", "Registry Key Name: Software\Policies\Microsoft\Windows\System", "Registry Value Name: EnableMmx" — exactly the proposal's HKLM path, value name and data "0". The docs block's consequences are the page's own words: "the Windows device isn't allowed to be linked to Phones, will remove itself from the device list of any linked Phones, and can't participate in Continue on PC experiences"; "If you don't configure this policy setting, the default behavior depends on the Windows edition"; "Changes to this policy take effect on reboot" — which is why the ShowComputerRestartSuggestion call is right, and that shared function (windows.yaml:40583) takes no parameters and is called with none. DisableCrossDeviceResume on the same page corroborates reference [3] ("continue tasks... that require linking between Phone and PC"). deleteOnRevert: 'true' restores the not-configured default, and the catalog already writes to this same shared System policy key (AllowCrossDeviceClipboard, windows.yaml:14277). Touches no update, signing or antivirus surface. recommend: strict plus the breakage in the script name and a Caution block is honest labelling, consistent with the existing strict 'Disable app access to phone calls (breaks phone calls through Phone Link)'. Insertion test: yamllint clean, application parse test passed.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity#allowphonepclinking`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity#disablecrossdeviceresume`
  - `https://web.archive.org/web/20240325075627/https://www.ctrl.blog/entry/microsoft-phone-link-privacy.html`

```yaml
            -
                name: Disable phone and PC linking (breaks Phone Link)
                recommend: strict
                docs: |-
                    Windows can link the PC to a phone so that reading, email, messages, and app activity continue across the two
                    devices [1]. Microsoft's Phone Link relays this personal data through Microsoft servers [2]. Newer cross-device
                    features build on the same link: Cross Device Resume needs the phone and the PC to be linked before it can
                    continue an activity on the PC [3].

                    This script disables the documented *Phone-PC linking on this device* policy (`EnableMmx`) [1]. The device can then
                    no longer enroll in phone-PC linking, it removes itself from the device list of any linked phone, and it cannot take
                    part in "Continue on PC" experiences [1]. The change takes effect after a restart [1].

                    Without the policy, the default depends on the Windows edition and users can link a phone from Settings [1]. The
                    policy applies to Windows 10, version 1803 and later, on Pro, Enterprise, Education, and IoT Enterprise editions [1].
                    The value does not exist on a default installation, so reverting deletes it.

                    > **Caution:**
                    > Phone Link, "Link to Windows", "Continue on PC", and phone-based resume stop working. A phone that was linked
                    > before must be linked again after reverting.

                    [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity#allowphonepclinking "Connectivity Policy CSP | Microsoft Learn"
                    [2]: https://web.archive.org/web/20240325075627/https://www.ctrl.blog/entry/microsoft-phone-link-privacy.html "Phone Link relays your personal data through Microsoft servers | Ctrl blog | ctrl.blog"
                    [3]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity#disablecrossdeviceresume "Connectivity Policy CSP | Microsoft Learn"
                call:
                    -
                        function: SetRegistryValue
                        parameters:
                            keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\System
                            valueName: EnableMmx
                            dataType: REG_DWORD
                            data: "0"
                            deleteOnRevert: 'true' # Missing by default, the policy is "not configured" on a clean installation
                    -
                        function: ShowComputerRestartSuggestion
```

#### Remove "Microsoft Copilot" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 22H2 and later (incl. 24H2 / 25H2) and Windows 10 22H2, all SKUs. The app is delivered by the Sept/Oct 2024 updates on Windows 11 and Nov 2024 on Windows 10.
- **Benefit:** Uninstalls the consumer Microsoft Copilot AI assistant package and marks it deprovisioned so Windows updates do not bring it back, removing a cloud AI entry point that sends user prompts and shared content to Microsoft. Complements the existing policy-only script, which only requests removal on managed devices and only when several Microsoft-side conditions are met.
- **Side effects:** Copilot no longer opens from the taskbar, the Copilot key, or Win+C. Reinstallable at any time from the Microsoft Store (product 9NHT9RB2F4HD); the script's revert also un-deprovisions the package and attempts re-registration. Does not affect Microsoft Store, Settings, or Windows Update.
- **Vetting note:** NOT A DUPLICATE: grep of src/application/collections/windows.yaml for `Microsoft.Copilot` finds no `UninstallStoreApp` call; the only Copilot entry is "Request removal of the Microsoft Copilot app" (line 37041) which writes the `RemoveMicrosoftCopilotApp` policy only. TARGET VERIFIED: `https://learn.microsoft.com/en-us/windows/client-management/manage-windows-copilot` section "Remove or prevent installation of the Microsoft Copilot app" documents `Get-AppxPackage -Name "Microsoft.Copilot"` + `Remove-AppxPackage`, links Store product 9NHT9RB2F4HD, and confirms the Sept/Oct 2024 (Win11) and Nov 2024 (Win10) rollout. `Copilot` is in the static removal list on `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal.` Package name + publisherId 8wekyb3d8bbwe confirmed against the repo's own docs/research/windows/08-windows-11-24H2-apps.txt (`Microsoft.Copilot 8wekyb3d8bbwe Installed`). SAFE: `UninstallStoreApp` (windows.yaml:38459) takes exactly packageName + publisherId, and its revertCode re-registers by manifest / package family name and deletes the Deprovisioned key. YAML/indent verified: entry `-` at col 20, keys at 24, matching the `Remove Windows apps` category (category at col 16); fragment parses under pyyaml. RECOMMEND CORRECTED: all 109 existing store-app removals in the collection have no recommend level (verified by parsing windows.yaml and grouping every UninstallStoreApp/UninstallNonRemovableStoreApp script by `recommend`), and the Standard preset tooltip promises "Retains functionality of all apps and system services" (src/presentation/components/Scripts/Menu/Recommendation/TheRecommendationSelector.vue:29). `strict` would auto-select an app uninstall in a preset, breaking that contract.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/manage-windows-copilot#remove-or-prevent-installation-of-the-microsoft-copilot-app`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-windowsai#removemicrosoftcopilotapp`
  - `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal`

```yaml
                    -
                        name: Remove "Microsoft Copilot" app
                        docs: |-
                            This script uninstalls the "Microsoft Copilot" app (package `Microsoft.Copilot`).

                            Since the September/October 2024 updates, Microsoft ships Copilot on Windows as an ordinary
                            Store app instead of a shell component [1]. It reached Windows 10 devices in November 2024 [1].
                            It is the consumer Copilot experience: user prompts and any content shared with it leave the
                            device and are processed by Microsoft services.

                            Microsoft documents removing the app with `Remove-AppxPackage` on `Microsoft.Copilot`, and
                            states that users can reinstall it from the
                            [Microsoft Store](https://apps.microsoft.com/detail/9NHT9RB2F4HD) afterwards [1].
                            Microsoft also lists `Copilot` among the preinstalled Store apps that administrators may
                            remove from Windows 11 images [3].

                            Without this script the app stays installed, keeps its taskbar entry, and the `Copilot`
                            hardware key and `Win`+`C` stay wired to it [1].

                            This script differs from "Request removal of the Microsoft Copilot app", which only writes the
                            `RemoveMicrosoftCopilotApp` policy. That policy applies to managed devices and removes the app
                            only when Microsoft 365 Copilot and Microsoft Copilot are both installed, the user did not
                            install Copilot, and the app was not launched in the previous 28 days [2]. This script removes
                            the package directly and additionally deprovisions it so Windows updates do not restore it.

                            Removing this app does not affect the Microsoft Store, Settings, or Windows Update.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ✅ |
                            | Windows 11 | 22H2 | ✅ |
                            | Windows 11 | 23H2 | ✅ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/manage-windows-copilot#remove-or-prevent-installation-of-the-microsoft-copilot-app "Remove or prevent installation of the Microsoft Copilot app | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-windowsai#removemicrosoftcopilotapp "WindowsAI Policy CSP | Microsoft Learn"
                            [3]: https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal "Policy-based in-box app removal | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: Microsoft.Copilot # Get-AppxPackage Microsoft.Copilot
                                publisherId: 8wekyb3d8bbwe
```

#### Remove "Bing Search" app

- **Category:** Remove bloatware > Remove Windows apps > Remove MSN (Bing) apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 24H2 and later, all SKUs (provisioned inbox app; present in this repo's 24H2 inventory). Not present on Windows 10 22H2 or Windows 11 23H2 and earlier, where the script is a no-op.
- **Benefit:** Removes the preinstalled Store app that renders Bing web results and web suggestions inside the Windows search box, so typed search text stops being sent to Bing at the app level instead of only being suppressed by policy. Complements the existing policy scripts (DisableSearchBoxSuggestions, BingSearchEnabled) by removing the component itself and deprovisioning it.
- **Side effects:** The Windows search box no longer shows Bing web results or web suggestions. Local search for apps, files, and settings is served by the shell search host and keeps working. Reinstallable from the Microsoft Store; the script's revert also un-deprovisions the package. Does not affect the Store, Settings, or Windows Update. Verify on a test image first: this package is newer than the catalog's newest inventory file (24H2).
- **Vetting note:** NOT A DUPLICATE: grep for `BingSearch` in windows.yaml hits only the `BingSearchEnabled` registry value (lines 7317/7329) and doc prose — no package removal. The complementary policies the docs claim exist do exist: `DisableSearchBoxSuggestions` (lines 7291, 7299) and `AllowCloudSearch` (line 6872). TARGET VERIFIED: `Microsoft.BingSearch 8wekyb3d8bbwe Provisioned` is in the repo's docs/research/windows/08-windows-11-24H2-apps.txt and absent from the 04/06/07 inventories, exactly matching the proposed ❌/❌/❌/✅/✅ table, so the "no-op on older builds" claim is correct and Provisioned+non-system means `Remove-AppxPackage` will succeed without the EndOfLife workaround. Confidence was 'likely', not 'unverified', and the package existence and removability are now positively confirmed. DOCS CORRECTED: the load-bearing safety sentence "results for apps, files, and settings are produced by the shell search host, which is part of the operating system and is not touched here [3]" cites `https://learn.microsoft.com/en-us/windows/application-management/overview-windows-apps`, which says nothing of the kind. I rewrote it to name the actual separate package (`Microsoft.Windows.Search`, which this collection removes in its own script at windows.yaml:33627) and dropped the unused [3] reference. recommend stays absent, which is correct.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-search#disablesearchboxsuggestions`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-search#allowcloudsearch`
  - `https://learn.microsoft.com/en-us/windows/application-management/overview-windows-apps`

```yaml
                            -
                                name: Remove "Bing Search" app
                                docs: |-
                                    This script uninstalls the "Bing Search" app (package `Microsoft.BingSearch`).

                                    Windows 11 version 24H2 preinstalls this app as a provisioned Store package. It supplies
                                    the Bing web results and web suggestions that appear inside the Windows search box, which
                                    means what you type into Start is sent to Bing while you type.

                                    The catalog already suppresses this behaviour with policy, through
                                    `DisableSearchBoxSuggestions` [1] and the older `BingSearchEnabled` value, and through
                                    `AllowCloudSearch` [2]. This script removes the component that provides the feature and
                                    marks it deprovisioned, so it is not reinstalled for new user profiles or during Windows
                                    updates.

                                    Local search keeps working: results for apps, files, and settings come from the separate
                                    shell search host package (`Microsoft.Windows.Search`), which this script does not touch.

                                    Without this script the app stays installed, and only the policy values stand between the
                                    search box and Bing.

                                    The app can be reinstalled from the Microsoft Store. Removing it does not affect the
                                    Microsoft Store, Settings, or Windows Update.

                                    > **Caution:** This package appeared after Windows 11 version 23H2. On earlier builds the
                                    > script finds nothing and exits without changes.

                                    ### Overview of default preinstallation

                                    | OS | Version | Existence |
                                    | -- |:-------:|:---------:|
                                    | Windows 10 | 22H2 | ❌ |
                                    | Windows 11 | 22H2 | ❌ |
                                    | Windows 11 | 23H2 | ❌ |
                                    | Windows 11 | 24H2 | ✅ |
                                    | Windows 11 | 25H2 | ✅ |

                                    [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-search#disablesearchboxsuggestions "Search Policy CSP - DisableSearchBoxSuggestions | Microsoft Learn"
                                    [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-search#allowcloudsearch "Search Policy CSP - AllowCloudSearch | Microsoft Learn"
                                call:
                                    function: UninstallStoreApp
                                    parameters:
                                        packageName: Microsoft.BingSearch # Get-AppxPackage Microsoft.BingSearch
                                        publisherId: 8wekyb3d8bbwe
```

#### Remove "Widgets Platform Runtime" app

- **Category:** Remove bloatware > Remove Widgets
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 24H2 and later, all SKUs (present as an installed package in this repo's 24H2 inventory). No-op on Windows 10 and on Windows 11 23H2 and earlier.
- **Benefit:** Completes the existing Widgets removal. The catalog hides the taskbar button and removes the Windows Web Experience Pack, but leaves the separate Widgets Platform Runtime package installed on Windows 11 24H2 and later. Removing it and deprovisioning it stops the widget host and its Microsoft Start content pipeline from being restored for new user profiles.
- **Side effects:** The Widgets board and third-party widget providers stop working. Nothing else depends on this package: the taskbar, Start, notifications, Store, Settings and Windows Update are unaffected. Reinstallable from the Microsoft Store; the script's revert also un-deprovisions the package. Verify on a test image first: this package is newer than the catalog's newest inventory file (24H2).
- **Vetting note:** NOT A DUPLICATE: grep for `WidgetsPlatformRuntime` in src/application/collections/ returns no hits. The existing `Remove Widgets` category (windows.yaml:36946) only hides the taskbar button (`TaskbarDa`) and removes `MicrosoftWindows.Client.WebExperience` (publisherId cw5n1h2txyewy) — a genuinely different package. TARGET VERIFIED: `Microsoft.WidgetsPlatformRuntime 8wekyb3d8bbwe Installed` is in the repo's docs/research/windows/08-windows-11-24H2-apps.txt and absent from 04/06/07, matching the table and confirming publisherId. Non-system, so `Remove-AppxPackage` succeeds and the shared function's revert re-registers by manifest or family name. Indentation 20/24 matches the `Remove Widgets` children level (category at col 16); fragment parses. DOCS CORRECTED: (a) the closing claim was cited to `https://learn.microsoft.com/en-us/windows/application-management/overview-windows-apps` ([3]), a generic overview page that does not support it — attribution dropped and reference removed; (b) the docs omitted that Windows 11 24H2 lock screen widgets are hosted by this same runtime, so I added an explicit caution. recommend stays absent, which is correct for this kind of removal.
- **Sources:**
  - `https://support.microsoft.com/en-us/windows/stay-up-to-date-with-widgets-7ba79aaa-dac6-4687-b460-ad16a06be6e4`
  - `https://support.microsoft.com/en-us/windows/how-to-update-the-windows-web-experience-pack-in-the-microsoft-store-a16c9bf1-f042-4dc9-a523-740cca1e1e60`
  - `https://learn.microsoft.com/en-us/windows/application-management/overview-windows-apps`

```yaml
                    -
                        name: Remove "Widgets Platform Runtime" app
                        docs: |-
                            This script uninstalls the "Widgets Platform Runtime" app
                            (package `Microsoft.WidgetsPlatformRuntime`).

                            On Windows 11 version 24H2 and later, the Widgets feature is split across more than one
                            package. "Remove \"Windows Web Experience Pack\" (breaks Widgets)" in this category removes
                            `MicrosoftWindows.Client.WebExperience` [2]; this script removes the separate runtime package
                            that hosts widgets and their content providers.

                            Widgets collect data about how the computer is used, and the individual widgets may collect
                            more [1]. Using them also means accepting Microsoft's general privacy terms, which allow
                            Microsoft to collect personal data [1].

                            Without this script the runtime stays installed, so widget hosting components remain on the
                            system even after the Web Experience Pack is removed.

                            The package can be reinstalled from the Microsoft Store. Removing it does not affect the
                            taskbar, Start, notifications, the Microsoft Store, Settings, or Windows Update.

                            > **Caution:** Every surface that hosts widgets stops working, including the Widgets board,
                            > third-party widget providers, and the lock screen widgets on Windows 11 version 24H2 and
                            > later.

                            > **Caution:** This package appeared after Windows 11 version 23H2. On earlier builds the
                            > script finds nothing and exits without changes.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ❌ |
                            | Windows 11 | 23H2 | ❌ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://support.microsoft.com/en-us/windows/stay-up-to-date-with-widgets-7ba79aaa-dac6-4687-b460-ad16a06be6e4 "Stay up to date with widgets | support.microsoft.com"
                            [2]: https://support.microsoft.com/en-us/windows/how-to-update-the-windows-web-experience-pack-in-the-microsoft-store-a16c9bf1-f042-4dc9-a523-740cca1e1e60 "How to update the Windows Web Experience Pack | support.microsoft.com"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: Microsoft.WidgetsPlatformRuntime # Get-AppxPackage Microsoft.WidgetsPlatformRuntime
                                publisherId: 8wekyb3d8bbwe
```

### Performance (5)

#### Configure Storage Sense to clear temporary files weekly

- **Category:** Performance improvements > Optimize storage and file system
- **Recommendation:** `strict`
- **Applies to:** Windows 10 1903+ and Windows 11, all versions. Documented for Pro, Enterprise, Education, IoT Enterprise; Home not covered by the CSP edition table.
- **Benefit:** Windows keeps Storage Sense off until the volume is nearly full, so temporary files from apps, installers and OS components pile up for months and are then removed in one emergency pass. A fixed weekly cadence keeps free space available continuously (NTFS allocation and Windows Update staging both degrade on a nearly-full system volume) and removes local traces of opened documents, media and installers. Every destructive Storage Sense action (Recycle Bin, Downloads, cloud dehydration) is explicitly pinned to 0 = never, so the script only removes unused temp files.
- **Side effects:** Storage Sense can no longer be turned off in Settings > System > Storage while the policy is applied. Microsoft documents these policies for Pro/Enterprise/Education/IoT Enterprise; they may be ignored on Windows Home. Revert deletes all six values, restoring the documented default (off until low disk space).
- **Vetting note:** DUPLICATE: `grep -c StorageSense src/application/collections/windows.yaml` = 0; no existing entry touches HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense. New. VERIFIED against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage` (fetched full page): all six value names exist with Registry Key Name `Software\Policies\Microsoft\Windows\StorageSense`, Windows 10 1903+ , Pro/Enterprise/Education/IoT Enterprise (Home not listed - the proposal states this). Cadence values confirmed verbatim: `0` low free disk space (default), `1` daily, `7` weekly, `30` monthly - so data '7' is right. Defaults confirmed: AllowStorageSenseGlobal 0, AllowStorageSenseTemporaryFilesCleanup 1, RecycleBin threshold 30, Downloads threshold 0, CloudContentDehydration 0. The docs table in the proposal matches the vendor page on every row, including 'The Windows default is 30 days' for the Recycle Bin. SAFE: no update/AV/signing/boot impact. deleteOnRevert on all six correctly returns every policy to 'Not configured', which the page documents as Storage Sense off until low disk space. CODE: SetRegistryValue exists (windows.yaml:41042) and every parameter used (keyPath, valueName, dataType, data, deleteOnRevert) is declared. Locale- and space-safe (reg add with single-quoted path). Parses. RECOMMEND CORRECTED standard -> strict: `AllowStorageSenseGlobal=1` plus a configured cadence means, per the vendor page, "Users can't disable Storage Sense" and can no longer adjust the cadence either. It also switches ON an automatic deletion agent that Windows ships OFF, and Storage Sense temporary-file cleanup can remove previous-Windows-installation staging, dropping the post-upgrade rollback window. That is a real functionality/usability cost, so it does not belong in the default Standard preset; 'strict' matches the privacy-gain-with-a-cost tier. NOTE FOR PARENT: categoryPath 'Performance improvements > Optimize storage and file system' does not exist. Top-level categories in windows.yaml are Privacy cleanup, Disable OS data collection, Configure programs, Security improvements, Block tracking hosts, Privacy over security, UI for privacy, Remove bloatware, Advanced settings. The category tree has to be created.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#allowstoragesenseglobal`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesenseglobalcadence`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#allowstoragesensetemporaryfilescleanup`
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesenserecyclebincleanupthreshold`
  - `https://gpedit.tplant.com.au/en-us/policy/StorageSense/SS_ConfigStorageSenseGlobalCadence/`

```yaml
                    -
                        name: Configure Storage Sense to clear temporary files weekly
                        recommend: standard
                        docs: |-
                            This script turns on **Storage Sense** and configures it to run every week, removing only unused temporary files.

                            Storage Sense is the disk cleanup agent built into Windows.
                            By default it stays off until the machine runs into low free disk space, and then it runs only while the machine is
                            under storage pressure [1].
                            Because of that default, temporary files written by applications, installers and Windows components accumulate for
                            months. A nearly full system volume slows down file allocation, leaves no room for update staging, and forces one
                            large emergency cleanup instead of many small ones.

                            This script sets a fixed weekly cadence [2] and allows only the temporary files cleanup [3].
                            Clearing temporary files also removes local traces of the documents, media and installers that you opened.

                            The script explicitly opts out of every destructive Storage Sense action:

                            | Registry value | Data | Effect |
                            | -------------- | ---- | ------ |
                            | `AllowStorageSenseGlobal` [1] | `1` | Storage Sense is always on. |
                            | `ConfigStorageSenseGlobalCadence` [2] | `7` | Storage Sense runs every week. The default `0` means "only during low free disk space". |
                            | `AllowStorageSenseTemporaryFilesCleanup` [3] | `1` | Unused temporary files are deleted. |
                            | `ConfigStorageSenseRecycleBinCleanupThreshold` [4] | `0` | The Recycle Bin is never emptied automatically. The Windows default is 30 days. |
                            | `ConfigStorageSenseDownloadsCleanupThreshold` [5] | `0` | Files in the `Downloads` folder are never deleted. This is also the Windows default. |
                            | `ConfigStorageSenseCloudContentDehydrationThreshold` [6] | `0` | Locally available cloud files are never made online-only. This is also the Windows default. |

                            All values are written to `HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense` [1].

                            > **Caution**:
                            > - While this script is applied, Storage Sense cannot be turned off in **Settings** > **System** > **Storage**.
                            > - Microsoft documents these policies for Pro, Enterprise, Education and IoT Enterprise editions [1].
                            >   They may be ignored on Windows Home.

                            Reverting deletes all six values and restores the documented default: Storage Sense stays off until free disk space runs low.

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#allowstoragesenseglobal "Storage Policy CSP - AllowStorageSenseGlobal | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesenseglobalcadence "Storage Policy CSP - ConfigStorageSenseGlobalCadence | Microsoft Learn"
                            [3]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#allowstoragesensetemporaryfilescleanup "Storage Policy CSP - AllowStorageSenseTemporaryFilesCleanup | Microsoft Learn"
                            [4]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesenserecyclebincleanupthreshold "Storage Policy CSP - ConfigStorageSenseRecycleBinCleanupThreshold | Microsoft Learn"
                            [5]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesensedownloadscleanupthreshold "Storage Policy CSP - ConfigStorageSenseDownloadsCleanupThreshold | Microsoft Learn"
                            [6]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-storage#configstoragesensecloudcontentdehydrationthreshold "Storage Policy CSP - ConfigStorageSenseCloudContentDehydrationThreshold | Microsoft Learn"
                        call:
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: AllowStorageSenseGlobal
                                    dataType: REG_DWORD
                                    data: '1'
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: ConfigStorageSenseGlobalCadence
                                    dataType: REG_DWORD
                                    data: '7' # Every week
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: AllowStorageSenseTemporaryFilesCleanup
                                    dataType: REG_DWORD
                                    data: '1'
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: ConfigStorageSenseRecycleBinCleanupThreshold
                                    dataType: REG_DWORD
                                    data: '0' # Never delete Recycle Bin content
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: ConfigStorageSenseDownloadsCleanupThreshold
                                    dataType: REG_DWORD
                                    data: '0' # Never delete downloads
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\StorageSense
                                    valueName: ConfigStorageSenseCloudContentDehydrationThreshold
                                    dataType: REG_DWORD
                                    data: '0' # Never dehydrate cloud-backed content
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
```

#### Minimize hibernation file size

- **Category:** Performance improvements > Optimize storage and file system
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 10 22H2 and Windows 11, all SKUs. Only acts when hibernation is currently enabled.
- **Benefit:** Reclaims a large fixed block of the system volume. A full hiberfil.sys is sized for full hibernation (S4); the documented 'reduced' hiberfile type only supports Fast Startup and therefore needs far less space (on a 32 GB RAM machine, a full hiberfile is ~13 GB). Free space on the system volume matters for update staging and NTFS allocation. Unlike the existing 'Disable hibernation' script, this keeps Fast Startup working.
- **Side effects:** Full hibernation is no longer available: Hibernate disappears from the power menu and the machine cannot save a session to disk before losing power. Laptops relying on 'hibernate after N minutes of sleep' lose that safety net. The script is a no-op when hiberfil.sys is absent, so it never re-enables hibernation on machines where it was deliberately turned off (avoids conflicting with the existing 'Disable hibernation for faster startup...' script).
- **Vetting note:** DUPLICATE: the only hibernation entry is 'Disable hibernation for faster startup and to avoid sensitive data storage' at windows.yaml:29918 (`code: powercfg -h off` / `revertCode: powercfg -h on`). Different mechanism and different outcome (that one deletes hiberfil.sys and kills Fast Startup; this one keeps Fast Startup). No shared registry key. Not a duplicate, and the `if exist` guard means it is a no-op on machines where that other script already ran, so the two cannot fight. VERIFIED against `https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options` (fetched): `/hibernate [/type reduced | full]` exists, "A reduced hiberfile only supports hiberboot", and the Note documents the exact sequence the script uses - "To change the hiberfile type to reduced, the OS has to manage the default hiberfile size. To do this, run the following commands: powercfg /hibernate /size 0 / powercfg /hibernate /type reduced". The note about HiberFileSizePercent >= 40 counting as a full hiberfile is also verbatim on that page. `/type full` restores the documented default. The `if exist` guard is not cosmetic - it is required, because the same page says of `/size`: "This parameter also causes hibernation to be enabled." Without the guard the script would silently re-enable hibernation on a machine where the user turned it off. The author got this right. SAFE: no boot/login/update/security-control impact; the only loss is S4 hibernate, which the docs block states plainly. recommend is correctly omitted (= none/opt-in), which is right for a change that removes a power state. CODE: RunInlineCode exists (windows.yaml:39199) with optional code/revertCode; batchfile is the collection language (scripting.language: batchfile). I parsed the entry with PyYAML - valid, single-FunctionCall form is allowed by .schema.yaml. The batch `if exist "%SystemDrive%\hiberfil.sys" ( ... ) else ( ... )` is locale-independent, path-with-spaces safe (quoted), and startCode has no errorlevel trap, so a powercfg failure on an unsupported device prints and continues rather than aborting the generated .bat. Minor, not blocking: if a user had a custom HiberFileSizePercent, revert restores type but not that custom size. NOTE FOR PARENT: the target category does not exist in windows.yaml and must be created.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options#hibernate-or-h`

```yaml
                    -
                        name: Minimize hibernation file size
                        docs: |-
                            This script shrinks `hiberfil.sys` by switching it to the *reduced* hiberfile type, and only if hibernation is
                            currently enabled.

                            Windows reserves `hiberfil.sys` on the system volume to hold the contents of RAM.
                            A *full* hiberfile is large enough for full hibernation (power state S4) and for Fast Startup (hiberboot).
                            A *reduced* hiberfile only supports Fast Startup [1], so Windows can reserve much less disk space.
                            Microsoft documents that a hiberfile with a custom default size, or with `HiberFileSizePercent` greater than or
                            equal to 40, counts as a full hiberfile [1].

                            This is a disk space optimization: on a machine with 32 GB of RAM, a full hiberfile occupies roughly 13 GB of the
                            system volume, while a reduced one is a fraction of that. The reclaimed space is directly useful, because Windows
                            Update staging and NTFS allocation both degrade on a nearly full system volume.

                            The script follows the exact sequence Microsoft documents for switching to a reduced hiberfile [1]:

                            1. `powercfg /hibernate /size 0` — hands the hiberfile size back to Windows.
                            2. `powercfg /hibernate /type reduced` — switches the hiberfile type.

                            To avoid re-enabling hibernation on machines where it was deliberately turned off (`powercfg /hibernate off` deletes
                            `hiberfil.sys`), the script only runs when `hiberfil.sys` exists.

                            > **Caution**:
                            > - Full hibernation is no longer available. **Sleep** and **Fast Startup** keep working, but **Hibernate**
                            >   disappears from the power menu, and the machine cannot save its session to disk before losing power.
                            > - Laptops that rely on "hibernate after N minutes of sleep" to protect unsaved work lose that safety net.

                            Reverting runs `powercfg /hibernate /type full`, which restores the documented Windows default hiberfile type.

                            [1]: https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options#hibernate-or-h "Powercfg command-line options | Microsoft Learn"
                        call:
                            function: RunInlineCode
                            parameters:
                                code: |-
                                    :: Shrink the hibernation file, but only if hibernation is enabled
                                    if exist "%SystemDrive%\hiberfil.sys" (
                                        powercfg /hibernate /size 0
                                        powercfg /hibernate /type reduced
                                    ) else (
                                        echo Hibernation is already disabled, skipping.
                                    )
                                revertCode: |-
                                    :: Restore the default hibernation file type, but only if hibernation is enabled
                                    if exist "%SystemDrive%\hiberfil.sys" (
                                        powercfg /hibernate /type full
                                    ) else (
                                        echo Hibernation is already disabled, skipping.
                                    )
```

#### Disable automatic maintenance wake-up

- **Category:** Performance improvements > Minimize background activity
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 8 and later, i.e. Windows 10 22H2 and Windows 11 25H2. Policy is machine-scope.
- **Benefit:** By default the maintenance scheduler is allowed to arm a wake timer, so a sleeping PC wakes itself at the maintenance time, runs housekeeping, then sleeps again. The documented 'Automatic Maintenance WakeUp Policy' setting disables only the wake request; maintenance itself still runs while the machine is idle and powered on, so drive optimization, TRIM and antivirus scans keep working. Measurable saving in energy and in unattended battery drain, with no loss of maintenance.
- **Side effects:** If the machine is always asleep at the scheduled time, maintenance is deferred until it is next awake and idle. Documented for Pro/Enterprise/Education (no gpedit on Home, although the maintenance scheduler reads the policy value). Takes effect after restart. Revert deletes the value, restoring 'not configured' where the Security and Maintenance user choice applies again.
- **Vetting note:** DUPLICATE: `grep -i 'Task Scheduler\\Maintenance|WakeUpPolicy' windows.yaml` = 0 hits. The existing 'Security and Maintenance' entries (windows.yaml:25593 onward) only disable notifications. New. VERIFIED against `https://gpedit.tplant.com.au/en-us/policy/msched/WakeUpPolicy/` (fetched): ADMX file Microsoft.Policies.MaintenanceScheduler, Registry Path `Software\Policies\Microsoft\Windows\Task Scheduler\Maintenance`, Registry Value Name `WakeUp`, Enabled Value 1, Disabled Value 0, supported on Windows 8 / Server 2012 and later. So data '0' is the correct write for the Disabled state, and deleteOnRevert correctly returns to Not configured, where - quoting that page - "the wake setting as specified in Security and Maintenance/Automatic Maintenance Control Panel will apply", which is exactly what the proposal's revert paragraph says. admx.help (source [1]) is returning HTTP 522 site-wide right now, so I verified via the independent ADMX viewer instead; the facts agree. SAFE: does not disable maintenance itself, only the wake request; no impact on Windows Update installation (Update Orchestrator arms its own wake timers), code signing, Defender or boot. CODE: SetRegistryValue + ShowComputerRestartSuggestion (windows.yaml:40583) both exist; keyPath contains a space and is emitted single-quoted by SetRegistryValue's `reg add '{{ $keyPath }}'`, so it is safe. RECOMMEND CORRECTED standard -> none: this entry has zero privacy benefit - it is a pure power/wear tweak - and 'standard' means it gets applied to every user of the default preset. It also defers Automatic Maintenance indefinitely on a machine that is always asleep at the maintenance window (the proposal admits this), which can push out idle-time Defender scans and drive optimization. Opt-in is the honest tier. NOTE FOR PARENT: target category does not exist in windows.yaml.
- **Sources:**
  - `https://admx.help/?Category=Windows_10_2016&Policy=Microsoft.Policies.MaintenanceScheduler::WakeUpPolicy`
  - `https://gpedit.tplant.com.au/en-us/policy/msched/WakeUpPolicy/`

```yaml
                    -
                        name: Disable automatic maintenance wake-up
                        recommend: standard
                        docs: |-
                            This script stops Windows from waking your computer to run its daily automatic maintenance.

                            Automatic Maintenance runs scheduled housekeeping such as drive optimization, security scans and update checks.
                            By default the maintenance scheduler is allowed to arm a wake timer, so a sleeping computer wakes up on its own at
                            the configured maintenance time, works for a while, and then goes back to sleep.

                            The **Automatic Maintenance WakeUp Policy** setting controls exactly this behaviour [1] [2].
                            When it is disabled, "Automatic Maintenance will not attempt to set OS wake policy and make a wake request for the
                            daily scheduled time" [1].
                            Maintenance itself is not turned off: it still runs while the computer is idle and powered on, so drive
                            optimization, `TRIM` and antivirus scans keep working.

                            The benefit is measurable in energy and in wear: the machine stays asleep instead of spinning up its fans and disks
                            every night, and laptops in a bag stop draining their battery on unattended maintenance sessions.

                            The script sets `HKLM\SOFTWARE\Policies\Microsoft\Windows\Task Scheduler\Maintenance!WakeUp` to `0` [1] [2].
                            This policy value overrides the corresponding user choice in **Security and Maintenance** [1].

                            > **Caution**: Microsoft documents this setting for Pro, Enterprise and Education editions.
                            > Windows Home has no Group Policy editor, although the maintenance scheduler still reads the policy value.

                            Reverting deletes the value, which restores the documented default (not configured), where the wake setting from
                            **Security and Maintenance** applies again [1].

                            [1]: https://admx.help/?Category=Windows_10_2016&Policy=Microsoft.Policies.MaintenanceScheduler::WakeUpPolicy "Automatic Maintenance WakeUp Policy | admx.help"
                            [2]: https://gpedit.tplant.com.au/en-us/policy/msched/WakeUpPolicy/ "Automatic Maintenance WakeUp Policy | ADMX Viewer"
                        call:
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\Task Scheduler\Maintenance
                                    valueName: WakeUp
                                    dataType: REG_DWORD
                                    data: '0'
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: ShowComputerRestartSuggestion
```

#### Disable search indexing on battery power

- **Category:** Performance improvements > Minimize background activity
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Portable Windows 10 22H2 / Windows 11 devices. ADMX-only policy (not in Policy CSP); gpedit exposure is Pro+, but the indexer reads the HKLM policy value on any SKU.
- **Benefit:** SearchIndexer.exe is one of the largest sources of unattended CPU and disk activity on a laptop and runs on battery exactly as on mains power. Windows Search ships a dedicated ADMX policy for this ('Prevent indexing when running on battery power to conserve energy'), so this is a vendor-provided control, not a hack. The existing catalog even lists PreventIndexOnBattery in a TODO comment as a missing setting (line ~7098).
- **Side effects:** While on battery, the index goes stale: files created or changed on battery are not found by Start menu or File Explorer search until indexing resumes on AC. Windows Search shows 'Indexing has been temporarily paused'. Useless on desktops. Revert deletes the value (default = indexing on battery allowed).
- **Vetting note:** DUPLICATE: `grep -n PreventIndexOnBattery windows.yaml` hits only the TODO comment at windows.yaml:7098 inside 'Disable privacy-invasive indexing' - a list of settings explicitly noted as missing, not implemented. Every implemented sibling in that category (AllowIndexingEncryptedStoresOrItems 7107, AlwaysUseAutoLangDetection 7122, PreventRemoteQueries 7154) uses a different value name. New, and it closes a TODO the maintainers left. VERIFIED: I fetched `https://www.windows-security.org/438a332196212d2996811a0e84262293/prevent-indexing-when-running-on-battery-power-to-conserve-energy`, which mirrors Search.admx: Registry Location HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search, Registry Value PreventIndexOnBattery, Scope Machine, ADMX File Search.admx, "When this policy is enabled, the indexer pauses while the computer runs on battery power... The default state is disabled." That confirms path, value name, semantics and default, so deleteOnRevert is the right revert. admx.help (source [2]) is down site-wide with HTTP 522, so I could not read it; that is why I edited the docs (see below). There is no Policy CSP page for this setting - it is ADMX-only - so an ADMX mirror is the best available vendor-derived evidence. SAFE: read-only-ish policy, no security control touched, laptop-only, recommend correctly omitted (opt-in). CODE: SetRegistryValue and ShowComputerRestartSuggestion both exist; space in keyPath is quoted by the function. I parsed my corrected entry with PyYAML - valid. CORRECTED YAML - two docs defects fixed, no behaviour change: 1. Removed the sentence 'Windows Search reports "Indexing has been temporarily paused" while this policy is in effect on battery [2]'. [2] is an admx.help registry-reference page; it does not and would not state a Windows Search UI string. That is a fabricated citation and the catalog's docs are its main value. 2. Replaced the misleading 'ADMX-only policy... gpedit exposure is Pro+' phrasing with an accurate caution that the setting is only exposed through Group Policy (absent on Home) while the indexer still reads the value, and added that the policy ships in Search.admx and is machine scoped - both directly supported by [1]. NOTE FOR PARENT: target category does not exist in windows.yaml. Also worth knowing: since Windows 10 2004 the indexer already throttles itself under Battery Saver, so this policy's delta is 'pause on any battery', not 'pause where Windows never would'.
- **Sources:**
  - `https://www.windows-security.org/438a332196212d2996811a0e84262293/prevent-indexing-when-running-on-battery-power-to-conserve-energy`
  - `https://admx.help/HKLM/SOFTWARE/Policies/Microsoft/Windows/Windows%20Search`

```yaml
                    -
                        name: Disable search indexing on battery power
                        docs: |-
                            This script stops the Windows Search indexer from indexing while the computer runs on battery.

                            `SearchIndexer.exe` continuously crawls your files and their contents to keep the search index current.
                            On a laptop this is one of the largest sources of unattended CPU and disk activity, and it runs on battery just as
                            it does on mains power.

                            Windows Search ships a dedicated policy for this, **Prevent indexing when running on battery power to conserve
                            energy** [1] [2].
                            When it is enabled, the indexer pauses while the machine is on battery and resumes once it is plugged in again [1].
                            The purpose stated by the policy itself is energy conservation [1].

                            The script sets `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search!PreventIndexOnBattery` to `1` [1] [2].
                            The value is missing by default, which means indexing on battery is allowed [1].
                            The policy comes from `Search.admx` and is machine scoped [1].

                            > **Caution**:
                            > - While the machine is on battery, the search index becomes stale. Files created or changed on battery are not
                            >   found by Start menu search or File Explorer search until indexing resumes on mains power.
                            > - This script is only useful on portable devices. It has no effect on a desktop.
                            > - Microsoft exposes this setting only through Group Policy, which is not available on Windows Home editions,
                            >   although the indexer reads the policy value on any edition.

                            Reverting deletes the value and restores the default, where the indexer runs on battery as well.

                            [1]: https://www.windows-security.org/438a332196212d2996811a0e84262293/prevent-indexing-when-running-on-battery-power-to-conserve-energy "Prevent indexing when running on battery power to conserve energy | Windows security encyclopedia"
                            [2]: https://admx.help/HKLM/SOFTWARE/Policies/Microsoft/Windows/Windows%20Search "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search | admx.help"
                        call:
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search
                                    valueName: PreventIndexOnBattery
                                    dataType: REG_DWORD
                                    data: '1'
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: ShowComputerRestartSuggestion
```

#### Disable cross-device experiences

- **Category:** Performance improvements > Minimize background activity
- **Recommendation:** `strict`
- **Applies to:** Windows 10 2004 + KB5005101 and later, Windows 11 21H2 and later. Documented for Pro, Enterprise, Education, IoT Enterprise.
- **Benefit:** The Connected Devices Platform keeps the machine continuously discoverable by the user's other devices and keeps announcing/polling in the background to serve Phone Link hand-off, Nearby Sharing, cross-device resume and shared clipboard. Microsoft's documented machine-scope EnableCdp policy makes the device non-discoverable and stops it participating, removing that background work and the per-network chatter it generates. Privacy bonus: the device stops advertising itself and its user identity to nearby devices.
- **Side effects:** Phone Link and all 'continue on this device' hand-off, Nearby Sharing, cross-device clipboard and cross-device resume stop working. Takes effect on reboot. Overlaps in user-visible effect with the existing 'Remove "Cross Device Experience Host" app' entry (Remove bloatware > Remove Phone apps), but that removes an appx package while this is the reversible policy that governs CDP discovery itself — no shared registry key or package. Revert deletes the value (default = not configured).
- **Vetting note:** DUPLICATE: `grep -i 'EnableCdp' windows.yaml` = 0 hits. Nearest neighbours are 'Remove "Cross Device Experience Host" app' (windows.yaml:32263, an appx removal) and AllowCrossDeviceClipboard (windows.yaml:14297, cloud clipboard only). Neither writes System!EnableCdp, and this is the reversible policy governing CDP discovery itself rather than a package removal. Partial overlap in user-visible effect only - acceptable, and the proposal discloses it. VERIFIED against `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-grouppolicy` (fetched, EnableCDP section): Registry Key Name `Software\Policies\Microsoft\Windows\System`, Registry Value Name `EnableCdp` (that exact casing), Device scope, Pro/Enterprise/Education/IoT Enterprise, Windows 10 2004 with KB5005101 [10.0.19041.1202] and later plus Windows 11 21H2 and later - the proposal's appliesTo matches the edition and build table line for line. The quoted sentence is verbatim: "If you disable this policy setting, the Windows device isn't discoverable by other devices, and can't participate in cross-device experiences." Friendly name 'Continue experiences on this device', GroupPolicy.admx. So data '0' is the correct Disabled write and deleteOnRevert correctly restores Not configured. SAFE: touches no security control - not updates, not code signing, not Defender, not boot or login. The losses (Phone Link hand-off, Nearby Sharing, cross-device clipboard and resume) are all listed in the Caution block. recommend: strict is the right tier for that trade-off - it breaks user-facing features, so it must not be in the Standard preset, and it is not. CODE: SetRegistryValue (windows.yaml:41042) and ShowComputerRestartSuggestion (windows.yaml:40583) exist with the parameters used; the page confirms "changes to this policy take effect on reboot", so the restart suggestion is justified rather than decorative. Clean-system safe (reg add creates the key; reg delete on revert is `2>$null` in the shared function). NOTE FOR PARENT: target category does not exist in windows.yaml. Also, purpose is tagged 'performance' but the real justification here is privacy plus network chatter - fine either way.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-grouppolicy#enablecdp`

```yaml
                    -
                        name: Disable cross-device experiences
                        recommend: strict
                        docs: |-
                            This script stops your computer from taking part in Windows cross-device experiences.

                            Cross-device experiences ("continue experiences") are served by the Connected Devices Platform.
                            They power Phone Link hand-off, Nearby Sharing, "continue on PC", cross-device resume and shared clipboard.
                            To make them work, the Connected Devices Platform service keeps the device continuously discoverable by other
                            devices that belong to the same user, and keeps announcing and polling in the background [1].

                            Microsoft documents a machine-scope policy for this: "If you disable this policy setting, the Windows device isn't
                            discoverable by other devices, and can't participate in cross-device experiences" [1].
                            Applying it removes the background discovery and hand-off work, together with the network chatter it generates on
                            every network you join. It also stops the device from advertising itself and its user identity to nearby devices.

                            The script sets `HKLM\SOFTWARE\Policies\Microsoft\Windows\System!EnableCdp` to `0` [1].
                            The value is missing by default; the resulting behaviour then depends on the Windows edition [1].
                            Microsoft states that changes to this policy take effect on reboot [1].

                            > **Caution**: the following features stop working:
                            > - Phone Link and any "continue on this device" hand-off from a phone or another PC.
                            > - Nearby Sharing.
                            > - Cross-device clipboard and cross-device resume.

                            Reverting deletes the value, which restores the documented default of not configured.

                            [1]: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-grouppolicy#enablecdp "ADMX_GroupPolicy Policy CSP - EnableCDP | Microsoft Learn"
                        call:
                            -
                                function: SetRegistryValue
                                parameters:
                                    keyPath: HKLM\SOFTWARE\Policies\Microsoft\Windows\System
                                    valueName: EnableCdp
                                    dataType: REG_DWORD
                                    data: '0'
                                    deleteOnRevert: 'true' # Missing by default on Windows 10 Pro (≥ 22H2) and Windows 11 Pro (≥ 23H2)
                            -
                                function: ShowComputerRestartSuggestion
```

### Debloat (4)

#### Remove "Microsoft Teams" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 22H2 and later (provisioned inbox app on 23H2, 24H2 and 25H2 retail images), all SKUs. On Windows 10 22H2 the package is only present if Teams was installed or updated to the new client.
- **Benefit:** Removes the preinstalled new Teams client and deprovisions it, so it stops being installed into every newly created user profile and stops running its account/presence background connections on machines that never use Teams.
- **Side effects:** Teams chat and meetings are unavailable until reinstalled. Reinstall from the Microsoft Store or with the documented teamsbootstrapper.exe -p installer; the script's revert also un-deprovisions the package. Does not touch Microsoft 365 desktop Office apps, the Store, Settings, or Windows Update.
- **Vetting note:** NOT A DUPLICATE: grep for `MSTeams` in src/application/collections/ returns no hits; the catalog's only Teams-adjacent entries are `Microsoft.SkypeApp` and `Microsoft.Windows.CallingShellApp`. TARGET VERIFIED: `MSTeams 8wekyb3d8bbwe Provisioned` is present in the repo's own docs/research/windows/08-windows-11-24H2-apps.txt, and `MSTeams` appears in the static removal list on `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal` (`<data id="MSTeams" value="false"/>`), confirming both the package identity and that Microsoft treats it as a removable preinstalled Store app. Removal command matches `https://learn.microsoft.com/en-us/microsoftteams/teams-client-uninstall.` SAFE: plain provisioned MSIX; no dependency on Office desktop apps, Store, or servicing. `UninstallStoreApp` params match the declared signature (packageName, publisherId); revert re-registers `MSTeams_8wekyb3d8bbwe`. Indentation (20/24) matches the `Remove Windows apps` children. RECOMMEND CORRECTED: `strict` would put an app uninstall into a one-click preset; the Strict tooltip commits to "Keeps vital security services and critical application functionality" and all 109 existing store-app removals in this collection deliberately carry no recommend level.
- **Sources:**
  - `https://learn.microsoft.com/en-us/microsoftteams/teams-client-uninstall`
  - `https://learn.microsoft.com/en-us/microsoftteams/teams-client-bulk-install`
  - `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal`
  - `https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#policy-based-removal-of-preinstalled-microsoft-store-apps`

```yaml
                    -
                        name: Remove "Microsoft Teams" app
                        docs: |-
                            This script uninstalls the new "Microsoft Teams" client (package `MSTeams`).

                            Windows 11 preinstalls Teams as a provisioned MSIX app, so Windows installs it for every user
                            who signs in and for "any users who may be added afterwards" [2]. Microsoft names Teams as one
                            of the preinstalled Store apps that administrators remove to "prevent removed apps [...] from
                            reappearing" [3] [4], and lists `MSTeams` in the supported removal list [3].

                            Microsoft documents the removal commands
                            `Get-AppxPackage *MSTeams* -AllUsers | Remove-AppxPackage -AllUsers` and
                            `Get-AppxPackage *MSTeams* | Remove-AppxPackage` [1]. Teams can be reinstalled from the
                            Microsoft Store, or provisioned again with `teamsbootstrapper.exe -p` [2].

                            Without this script Teams stays provisioned in the image and keeps signing in with a Microsoft
                            account or work account, holding a background presence and notification connection to
                            Microsoft servers.

                            Removing this app does not affect the desktop Microsoft 365 Office applications, the Microsoft
                            Store, Settings, or Windows Update.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ❌ |
                            | Windows 11 | 23H2 | ✅ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/microsoftteams/teams-client-uninstall "Uninstall the Teams client | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/microsoftteams/teams-client-bulk-install "Bulk deploy the Microsoft Teams desktop client | Microsoft Learn"
                            [3]: https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal "Policy-based in-box app removal | Microsoft Learn"
                            [4]: https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#policy-based-removal-of-preinstalled-microsoft-store-apps "What's new in Windows 11, version 25H2 | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: MSTeams # Get-AppxPackage MSTeams
                                publisherId: 8wekyb3d8bbwe
```

#### Remove "Clipchamp" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 22H2 and later (provisioned inbox app on 23H2 / 24H2 / 25H2 retail images), all SKUs. Not preinstalled on Windows 10.
- **Benefit:** Removes the preinstalled cloud video editor and deprovisions it, so it stops being installed into every new user profile. Clipchamp requires signing in with a Microsoft, Google or Facebook account and stores projects with Microsoft's cloud service, so removing it on machines that never edit video cuts an account-linked cloud component out of the image.
- **Side effects:** No built-in video editor remains; Windows keeps Photos and Media Player for playback and basic trimming. Reinstallable from the Microsoft Store at any time; the script's revert also un-deprovisions the package. Does not affect the Store, Settings, or Windows Update.
- **Vetting note:** NOT A DUPLICATE: grep for `Clipchamp` in src/application/collections/ returns no hits. TARGET VERIFIED: `Clipchamp.Clipchamp yxz26nhyzhsrt Provisioned` appears in the repo's own 06-windows-11-22H2, 07-windows-11-23H2 and 08-windows-11-24H2 inventories and is absent from 04-windows-10-22H2 — exactly matching the proposed table, including the unusual publisherId `yxz26nhyzhsrt`. `Clipchamp` is in the static removal list on `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal` (`<data id="Clipchamp" value="false"/>`). SAFE and revertible; no OS component depends on it. DOCS CORRECTED: the sentence "editing requires signing in, and project data is handled by Microsoft's Clipchamp service rather than staying purely local" is not supported by either cited Microsoft Learn page (the third proposed source, a support.microsoft.com URL with a malformed article GUID, is not cited in the YAML at all), so I replaced it with a claim the sources do support. RECOMMEND CORRECTED: `standard` contradicts the Standard preset's documented promise to retain "functionality of all apps and system services" (TheRecommendationSelector.vue:29) and breaks the collection-wide convention that all 109 store-app removals have no recommend level.
- **Sources:**
  - `https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#policy-based-removal-of-preinstalled-microsoft-store-apps`
  - `https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal`
  - `https://support.microsoft.com/en-us/windows/create-videos-with-clipchamp-a-4a5e0e59-2a6d-4bb2-9c4a-1e0f9ea1e7d3`

```yaml
                    -
                        name: Remove "Clipchamp" app
                        docs: |-
                            This script uninstalls the "Microsoft Clipchamp" app (package `Clipchamp.Clipchamp`).

                            Clipchamp is a preinstalled video editor that Microsoft acquired and bundles with Windows 11.
                            It is a cloud-connected, account-based service, so on a machine that never edits video it is
                            unused code with an online dependency.

                            Microsoft names Clipchamp as one of the preinstalled Store apps that administrators remove so
                            it does not reappear on the device [1], and lists `Clipchamp` in the supported removal
                            list [2].

                            Without this script the app stays provisioned in the image, so Windows installs it again for
                            each newly created user profile [2].

                            Clipchamp can be reinstalled from the Microsoft Store at any time. Removing it does not affect
                            the Microsoft Store, Settings, or Windows Update; Photos and Media Player still handle
                            playback.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ✅ |
                            | Windows 11 | 23H2 | ✅ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/windows/whats-new/whats-new-windows-11-version-25h2#policy-based-removal-of-preinstalled-microsoft-store-apps "What's new in Windows 11, version 25H2 | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows/configuration/policy-based-inbox-app-removal/policy-based-inbox-app-removal "Policy-based in-box app removal | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: Clipchamp.Clipchamp # Get-AppxPackage Clipchamp.Clipchamp
                                publisherId: yxz26nhyzhsrt
```

#### Remove "Dev Home" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 23H2 and later (provisioned inbox app on 24H2 retail images), all SKUs. Not present on Windows 10.
- **Benefit:** Removes a preinstalled app that Microsoft stopped supporting in May 2025. It is dead weight that still registers widget providers and offers to connect GitHub and Azure DevOps accounts, and it is provisioned so it is installed for every new user profile.
- **Side effects:** Dev Home and its dashboard widgets are gone. Dev Drive, File Explorer version control integration and Sudo for Windows are separate Windows features and are unaffected. Reinstallable with winget install Microsoft.DevHome or from the Microsoft Store; the script's revert also un-deprovisions the package.
- **Vetting note:** NOT A DUPLICATE: the only `DevHome` hit in windows.yaml is a citation URL at line 37900 (a Google Groups archive link inside the Outlook script's docs), not a removal script. TARGET AND DEPRECATION VERIFIED: `Microsoft.Windows.DevHome 8wekyb3d8bbwe Provisioned` is in the repo's docs/research/windows/08-windows-11-24H2-apps.txt, and `https://learn.microsoft.com/en-us/previous-versions/windows/dev-home/` carries the notice verbatim: "Starting May 2025, Dev Home will no longer be supported as a feature in Windows 11. See Advanced Windows settings for information on File Explorer version control integration, Sudo for Windows..." with `is_archived: true` / `ROBOTS: NOINDEX,NOFOLLOW`. FACTUAL ERROR FIXED: the proposed table claims Windows 11 23H2 ✅, but the repo's own docs/research/windows/07-windows-11-23H2-apps.txt does not list `Microsoft.Windows.DevHome` (only Clipchamp, PowerAutomateDesktop and QuickAssist among the relevant packages) — Dev Home preinstallation began with 24H2. Corrected to ❌. SAFE: provisioned, non-system package; revert re-registers by family name. RECOMMEND CORRECTED to none for the same reason as the other app removals (Standard preset promises app functionality is retained; 109/109 existing store-app removals carry no level).
- **Sources:**
  - `https://learn.microsoft.com/en-us/previous-versions/windows/dev-home/`
  - `https://learn.microsoft.com/en-us/windows/advanced-settings/`

```yaml
                    -
                        name: Remove "Dev Home" app
                        docs: |-
                            This script uninstalls the "Dev Home" app (package `Microsoft.Windows.DevHome`).

                            Dev Home is a preinstalled developer dashboard. Microsoft retired it: "Starting May 2025, Dev
                            Home will no longer be supported as a feature in Windows 11" [1], and its documentation is now
                            archived. The replacements Microsoft points to (File Explorer version control integration and
                            Sudo for Windows) live in Advanced Windows settings and do not need this app [1] [2].

                            The app registers dashboard widget providers and prompts to connect GitHub and Azure DevOps
                            accounts through its extensions [1]. Because it is provisioned, Windows keeps installing it for
                            every newly created user profile.

                            Without this script an unsupported app stays on the system and keeps receiving no fixes.

                            Dev Home can be reinstalled from the Microsoft Store or with `winget install Microsoft.DevHome`.
                            Removing it does not affect Dev Drive, the Microsoft Store, Settings, or Windows Update.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ❌ |
                            | Windows 11 | 23H2 | ❌ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/previous-versions/windows/dev-home/ "Dev Home for Windows Developers (archived) | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/windows/advanced-settings/ "Advanced Windows settings | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: Microsoft.Windows.DevHome # Get-AppxPackage Microsoft.Windows.DevHome
                                publisherId: 8wekyb3d8bbwe
```

#### Remove "Power Automate" app

- **Category:** Remove bloatware > Remove Windows apps
- **Recommendation:** not recommended (opt-in only)
- **Applies to:** Windows 11 22H2 and later, all SKUs (present as a provisioned inbox app on 24H2 retail images; confirmed in this repo's own 24H2 inventory). Not preinstalled on Windows 10.
- **Benefit:** Removes the preinstalled Power Automate desktop automation client. It is a Power Platform cloud client that requires signing in and reaching Microsoft service URLs, and it ships an automation engine capable of driving the whole UI. Removing it on machines that do not build desktop flows shrinks both the image and the attack surface, and stops it being installed into every new user profile.
- **Side effects:** Desktop flows can no longer be created or run locally. Reinstallable from the Microsoft Store without admin rights, or with the MSI installer; the script's revert also un-deprovisions the package. Does not affect the Store, Settings, or Windows Update.
- **Vetting note:** NOT A DUPLICATE: grep for `PowerAutomate` in src/application/collections/ returns no hits. TARGET VERIFIED against the repo's own research files: `Microsoft.PowerAutomateDesktop 8wekyb3d8bbwe Provisioned` is present in 05-windows-11-21H2, 06-windows-11-22H2, 07-windows-11-23H2 and 08-windows-11-24H2 inventories and absent from 04-windows-10-22H2, matching the proposed table (which is conservative — it omits the 21H2 row it could have claimed). SAFE: an ordinary provisioned Store app with no OS component depending on it; removal is a plain `Remove-AppxPackage` and the shared function's revert re-registers `Microsoft.PowerAutomateDesktop_8wekyb3d8bbwe`. Function parameters match the declared signature at windows.yaml:38459. Indentation 20/24 matches the `Remove Windows apps` children level. RECOMMEND CORRECTED: `standard` conflicts with the Standard preset's documented guarantee "Retains functionality of all apps and system services" and with the collection-wide convention (verified programmatically: 109 store-app removals, 0 with a recommend level).
- **Sources:**
  - `https://learn.microsoft.com/en-us/power-automate/desktop-flows/install`
  - `https://learn.microsoft.com/en-us/power-automate/desktop-flows/requirements`
  - `https://learn.microsoft.com/en-us/power-automate/desktop-flows/how-to/proxy-settings`

```yaml
                    -
                        name: Remove "Power Automate" app
                        docs: |-
                            This script uninstalls the "Power Automate" app (package `Microsoft.PowerAutomateDesktop`).

                            Windows 11 preinstalls the Microsoft Store build of Power Automate for desktop. The app is a
                            client for the Power Platform cloud: it needs an account to sign in, requires a set of Microsoft
                            service URLs to be reachable, and uses the Windows proxy configuration for its outbound
                            traffic [1] [2].

                            It also installs a robotic-process-automation engine that can drive the whole desktop user
                            interface. On a machine that never builds desktop flows this is unused code with broad
                            capability.

                            Without this script the app stays provisioned in the image, so Windows installs it again for
                            every newly created user profile.

                            Power Automate can be reinstalled from the Microsoft Store without administrator rights, or
                            with the MSI installer [1]. Removing it does not affect the Microsoft Store, Settings, or
                            Windows Update.

                            ### Overview of default preinstallation

                            | OS | Version | Existence |
                            | -- |:-------:|:---------:|
                            | Windows 10 | 22H2 | ❌ |
                            | Windows 11 | 22H2 | ✅ |
                            | Windows 11 | 23H2 | ✅ |
                            | Windows 11 | 24H2 | ✅ |
                            | Windows 11 | 25H2 | ✅ |

                            [1]: https://learn.microsoft.com/en-us/power-automate/desktop-flows/install "Install Power Automate | Microsoft Learn"
                            [2]: https://learn.microsoft.com/en-us/power-automate/desktop-flows/requirements "Power Automate for desktop requirements | Microsoft Learn"
                        call:
                            function: UninstallStoreApp
                            parameters:
                                packageName: Microsoft.PowerAutomateDesktop # Get-AppxPackage Microsoft.PowerAutomateDesktop
                                publisherId: 8wekyb3d8bbwe
```

## Rejected by vetting (6)

Kept here so the same ideas are not re-proposed.

### Disable app access to text and image generation

- **Reason:** ineffective
- **Detail:** Grep: 0 hits for systemAIModels / generativeAI / LetAppsAccessSystemAIModels / LetAppsAccessGenerativeAI in src/application/collections/ — not a duplicate. But the targets do not exist as documented. Fetched `https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-privacy:` it contains no policy matching "SystemAIModels" or "GenerativeAI" at all (it does contain LetAppsAccessForegroundText and its three exception lists, so the fetch was complete). Fetched `https://learn.microsoft.com/en-us/windows/uwp/packaging/app-capability-declarations:` zero matches for systemAIModels, generativeAI, or even the substring "generative", so the consent-store capability names are undocumented too. The WindowsAI Policy CSP (fetched in full) also has no text/image-generation policy. The 25H2 IT-pro doc only confirms the UI exists — verbatim: "**Settings** > **Privacy & security** > **Text and Image Generation** displays the apps that have recently used on-device generative AI models provided by Windows" — with no policy or registry name. The proposal's only technical source for all four registry names is elevenforum.com, a forum, not vendor docs, and confidence was 'likely'. So two of the four calls write junk values under HKLM\...\AppPrivacy that no component reads, and the other two are worse than inert: BlockUWPAccessViaConsentStore uses dataOnRevert: 'Allow' (windows.yaml:41341), so a wrong capability name creates two brand-new ConsentStore subkeys and leaves them permanently set to Value=Allow after a revert. Not fixable without a verified key name.

### Disable last file access time recording

- **Reason:** unverifiable
- **Detail:** DUPLICATE: `grep -i 'disablelastaccess|NtfsDisableLastAccessUpdate' windows.yaml` = 0 hits. New. But the central claims are not supported by either cited source, and I could not verify them elsewhere. I fetched both sources. `https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fsutil-behavior` documents `disablelastaccess {1|0}` ONLY - two states. I then fetched the GitHub source the proposal cites as [2] (raw.githubusercontent.com/MicrosoftDocs/windowsserverdocs/main/.../fsutil-behavior.md) and confirmed: "The documentation mentions only values 0 and 1 for disablelastaccess. There is no reference to values 2 or 3 (System Managed)." So the four-state table in the docs block, and specifically the statement that `2` is 'the Windows default', are attributed to [1] and [2] which say no such thing. That means the revertCode `fsutil behavior set disablelastaccess 2` writes a value neither cited source documents as accepted or as the default - exactly the 'revertCode restores the wrong default' failure mode I am told to reject on, and I have no vendor doc to confirm otherwise. EFFECTIVENESS is also overstated by the very page cited. The proposal claims 'a single directory walk otherwise triggers thousands of metadata writes', but the same Remarks section states "One hour is the maximum amount of time that NTFS can defer updating Last Access Time on disk" and that in-memory values stay accurate - i.e. Windows already coalesces on-disk updates to at most one per file per hour, so the residual gain is far smaller than described. All the page commits to is the generic sentence "Disabling the Last Access Time feature improves the speed of file and directory access." The idea (privacy: last-access is a forensic artifact, consistent with the existing 'Clear prefetch folder' entry at windows.yaml:1593) is reasonable, but I cannot repair it without inventing a citation for the revert value, so it fails step 5.

### Disable application prelaunch

- **Reason:** ineffective
- **Detail:** DUPLICATE: `grep -i 'MMAgent|prelaunch' windows.yaml` = 0 hits; SysMain/memory compression are not touched anywhere either. New. The API is real - I fetched `https://learn.microsoft.com/en-us/powershell/module/mmagent/disable-mmagent` and confirmed `Disable-MMAgent [-ApplicationPreLaunch]` (alias apl, SwitchParameter) exists in the in-box MMAgent module. The code would also run: RunPowerShell exists (windows.yaml:39055) with code/revertCode/codeComment/revertCodeComment, and the multi-line if/try/catch survives the `inlinePowerShell` pipe (I read src/.../PipeDefinitions/InlinePowerShell.ts - `} catch {` on one line is inlined by mergeLinesWithBracketCodeBlocks, and `exit 0` plus "...$($_.Exception.Message)" match existing catalog usage at windows.yaml:34521 and 38403). It fails step 2. Application prelaunch is opt-in per application: only packaged/UWP apps that call the prelaunch API are ever speculatively started, and the feature's main consumer, Edge Legacy, is gone from Windows 10 22H2 and Windows 11. Neither cited page (enable-mmagent, disable-mmagent) makes any claim about CPU, RAM or disk cost, so the stated benefit - 'returns that CPU time and working set to the applications actually in use' - has no vendor support and, on a modern system with nothing opted in, no measurable effect. I could not positively confirm any effect on the claimed OS versions, and the gate is confirm-or-reject. The privacy rationale also does not hold as written: the launch-history prediction model is maintained by ApplicationLaunchPrefetching / SysMain, which this script deliberately leaves enabled (the sideEffects note even says so), so nothing stops Windows 'acting on a usage-prediction model built from your launch history' - only one consumer of it is switched off.

### Configure high performance power plan

- **Reason:** ineffective
- **Detail:** DUPLICATE: `grep -n 'setactive|8c5e7fda' windows.yaml` = 0 hits; the only powercfg use is `powercfg -h off` at windows.yaml:29934. New - but it fails step 2. The two cited sources do not support the mechanism, and one of them argues against it. I fetched `https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/customize-power-slider`, which states: "The slider will appear on a device only when the Balanced power plan, or any plan that is derived from Balanced, is selected... Devices that have the High Performance, Power Saver, or any 'OEM Recommended' power plans... These users will not see the slider UX", and "After the user changes to a Balanced performance plan, there is no way for them to go back to using the High Performance plan from the UI." The proposal's primary source, 'Tips to improve PC performance in Windows', tells users to set the **power mode** to best performance - that is the slider/overlay, not the legacy plan GUID. So the script's action removes the Settings control that its own headline citation recommends. It is also the weaker of the two paths: the same page says power throttling is disengaged for all applications only in the Best Performance **slider** mode, which the legacy plan does not do. Net effect on a modern Windows 10 22H2 / Windows 11 machine is a hidden UI control and more heat, not the claimed responsiveness win - and confidence was only 'likely', with no vendor statement anywhere for 'no ramp-up latency from a parked or down-clocked core'. The revert is also wrong for most real machines: `powercfg /setactive 381b4222-...` forces Balanced, but the previously active plan is very often an OEM-recommended custom plan (Dell/Lenovo/ASUS) or Power saver, and `https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options` only shows the Balanced GUID in examples - it never documents 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c, which the docs block cites [2] for. Reverting therefore silently changes the machine's power configuration to something the user never had. The batch itself is fine (RunInlineCode exists, `||` with a parenthesised block is valid, startCode has no errorlevel trap so a missing plan is non-fatal), so this is not a broken-code rejection - the idea itself does not hold up.

### Disable "Recall" optional feature

- **Reason:** duplicate
- **Detail:** The catalog already does this, and does it more completely. `Disable Recall` (windows.yaml:2624, recommend: strict) sets `AllowRecallEnablement=0` under `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsAI`. `https://learn.microsoft.com/en-us/windows/client-management/manage-recall` states for that exact policy: "If you disable this policy, the Recall component will be in disabled state and the bits for Recall will be removed from the device. If snapshots were previously saved on the device, they'll be deleted when this policy is disabled." That is precisely the proposal's claimed added value ("Removes the Recall component itself", "Also deletes any snapshots that were already saved"), and the same doc restricts only the storage and app/website filtering policies to Enterprise/Education — AllowRecallEnablement is not SKU-limited, so the existing script covers unmanaged consumer Copilot+ PCs too. The existing script also already applies `DisableAIDataAnalysis=1`. Worse, the proposed code does strictly less than its own documentation: it calls the shared `DisableWindowsFeature` (windows.yaml:38334), whose generated command is `Disable-WindowsOptionalFeature -FeatureName "Recall" -Online -NoRestart` with no `-Remove` flag — yet the docs quote Microsoft's `Disable-WindowsOptionalFeature -Online -FeatureName "Recall" -Remove` and assert "takes the Recall component off the device" and "Snapshots that were already saved are deleted when Recall is turned off [1]". Neither the bits removal nor the snapshot deletion is documented for a plain feature disable; Microsoft documents both only as effects of the policy. The docs also elide the qualifier in the quoted sentence — Microsoft's text reads "If a user prefers to remove the Recall bits from their device **after an IT admin has enabled Allow Recall to be enabled**", which is the opposite of the proposal's framing that this is the consumer path. Net effect: an overlapping second script that is weaker than the one already shipping and whose docs overstate what it does.

### Remove "VBScript" capability

- **Reason:** unverifiable
- **Detail:** The capability name cannot be confirmed from vendor documentation, and the proposal's own confidence was 'likely'. I fetched all three cited sources plus the FoD reference. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features-resources#vbscript` says only: "VBScript will be available as a feature on demand before being retired in future Windows releases. Initially, the VBScript feature on demand will be preinstalled..." — future tense, no capability name. `https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features` likewise: "In future releases of Windows, VBScript will be available as a feature on demand before its removal from the operating system" (announced October 2023). Critically, `https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/features-on-demand-non-language-fod` — the authoritative capability-name list, last updated 2026-02-20 — has no VBSCRIPT entry at all, in any of its four sections; it does list WMIC (`WMIC~~~~`), Quick Assist, Notepad, Paint, etc. So neither the proposed name `VBSCRIPT~~~~` nor the claimed "🟢 Installed" default on Windows 11 ≥ 24H2 is verifiable, and the repo's own research files under docs/research/windows/ cover Appx packages only, not capabilities. Because `UninstallCapability` matches by prefix and silently no-ops when nothing matches, an incorrect name would ship a script that appears to work and never does anything. Separately, the docs understate the impact: they name installer custom actions and logon scripts, but not the in-box VBScript tools that break — most notably `slmgr.vbs` (Windows license/activation management), `winrm.vbs` and `pubprn.vbs`. Given an unverifiable target plus undisclosed breakage of activation tooling, this does not clear the bar.

## Unvetted proposals (47)

Researched but not yet checked for duplication, current validity, safety and working code.

### Browsers and third-party applications (24)

- **Disable Chrome URL-keyed anonymized data collection** - windows.yaml, privacy, `standard`. Stops Chrome from sending the address of every page you open to Google. This is a separate data stream from crash and usage metrics, so the catalog's existing "Disable Chrome metrics reporting" script does not cover it.
- **Minimize Chrome feature experiments** - windows.yaml, privacy, `strict`. Limits Chrome's variations (field trial) service to critical security and stability fixes only. The variations service is how Google remotely turns features on and off per client; it fetches a seed and reports which tria
- **Disable Chrome search suggestions** - windows.yaml, privacy, `strict`. Stops Chrome from sending what you type in the address bar to the search provider before you press Enter. This transmits text you typed and then deleted, and text you never intended to search for. The catalog already doe
- **Disable Chrome spell check web service** - windows.yaml, privacy, `standard`. Stops Chrome's "enhanced spell check" from uploading the text you type in web forms to a Google web service. This is one of the least obvious text-exfiltration paths in Chrome, because it applies to whatever you type int
- **Disable Chrome network prediction** - windows.yaml, privacy, `standard`. Stops Chrome from resolving DNS, opening TCP/TLS connections and prerendering pages for links you have not clicked. Prediction leaks intent to your DNS resolver and to third-party hosts, and it fetches content from sites
- **Block Chrome third party cookies** - windows.yaml, privacy, `strict`. Blocks the classic cross-site tracking primitive in Chrome: cookies set by a domain other than the one in the address bar, which is how ad and analytics networks recognise the same browser across every site they are embe
- **Minimize Chrome WebRTC private IP address exposure** - windows.yaml, privacy, not recommended (opt-in only). Stops websites from reading your local network addresses through WebRTC. Any page with JavaScript can enumerate WebRTC ICE candidates and learn your private LAN address (and, behind a VPN, sometimes your real interface),
- **Disable Firefox studies** - windows.yaml, privacy, `standard`. Stops Mozilla from installing and running experiments (Shield studies, and the Nimbus experiments that replaced Normandy) inside your Firefox. Studies change browser behaviour remotely and report measurements back to Moz
- **Disable Firefox sponsored content** - windows.yaml, privacy, `standard`. Turns off every sponsored surface in Firefox at once: sponsored shortcuts and sponsored stories on the new tab page, sponsored address bar suggestions from Firefox Suggest, and the Firefox Suggest data collection that se
- **Disable Firefox studies** - linux.yaml, privacy, `standard`. Stops Mozilla from installing and running experiments in Firefox on Linux. This is the pref that actually still works: a Mozilla engineer states on bug 1749955 that app.normandy.enabled is not effective now that experime
- **Disable Firefox sponsored content** - linux.yaml, privacy, `standard`. Removes the sponsored shortcuts and sponsored stories that Firefox shows on the new tab page. Both prefs are true by default in current mozilla-central, and both cause impression and interaction reporting to an advertisi
- **Disable Firefox sponsored content** - macos.yaml, privacy, `standard`. Brings the Firefox sponsored-content and Firefox Suggest data-collection hardening to macOS, which currently has only a single Firefox script (telemetry). It uses the mechanism Mozilla itself documents for the command li
- **Disable Chrome browsing history collection** - windows.yaml, privacy, `standard`. Stops Chrome sending the URL of every page you open to Google. This is the "Make searches and browsing better" setting, internally URL-keyed anonymized data collection; because the payload is the page URL it is effective
- **Disable Chrome online spell checking** - windows.yaml, privacy, `standard`. Chrome can spell-check either with a locally downloaded dictionary or with a Google web service; the web service uploads the contents of the text field. That means text typed into comment boxes, web mail and forms leaves
- **Disable Edge online spell checking** - windows.yaml, privacy, `standard`. Same class of leak on Edge: Microsoft Editor sends the contents of editable web-page text fields to a Microsoft service to produce enhanced spelling and grammar results. Forcing the local platform/Hunspell engine keeps s
- **Disable Edge payment method checks by websites** - windows.yaml, privacy, `standard`. Pages can silently call PaymentRequest.canMakePayment and PaymentRequest.hasEnrolledInstrument to learn whether the browser has a stored payment instrument, without ever showing a payment UI. That is both a wallet-conten
- **Disable Chrome search and site suggestions** - windows.yaml, privacy, `strict`. With suggestions on, Chrome ships your address-bar keystrokes to the search provider as you type — including text you typed and then deleted and never submitted. Turning the policy off keeps local history and bookmark su
- **Disable WebRTC exposure of your private IP address in Chrome** - windows.yaml, privacy, not recommended (opt-in only). Any page with JavaScript can read the ICE candidates WebRTC gathers, which by default include the private address your router handed you. That leaks your internal network layout and gives trackers a cookie-independent id
- **Disable Firefox studies and experiments** - windows.yaml, privacy, `standard`. Firefox Shield studies let Mozilla remotely install temporary add-ons or flip hidden preferences in your browser to test changes on a sample of users, and report the results back. Participation is on by default and the s
- **Disable Firefox sponsored content on the home page** - windows.yaml, privacy, `standard`. The Firefox home page and new tab page ship paid placements by default: sponsored shortcuts among the top sites and sponsored stories among the recommended articles. Mozilla reports which sponsored tiles were shown and c
- **Disable Firefox sponsored address bar suggestions** - windows.yaml, privacy, `standard`. Firefox Suggest injects results from Mozilla's servers into the address bar drop-down, some of which are paid placements from advertising partners, and a companion setting lets Mozilla collect the text you type in the ad
- **Disable Firefox sponsored address bar suggestions** - linux.yaml, privacy, `standard`. Linux parity for the Windows entry above, using the catalog's existing AddFirefoxPrefs function so it works for deb/rpm, Flatpak and Snap Firefox profiles alike. The Linux Firefox coverage is deep on telemetry and tracki
- **Disable Firefox sponsored content on the home page** - linux.yaml, privacy, `standard`. Linux parity for the new tab ad surface: removes sponsored shortcuts and sponsored stories, which Mozilla reports impressions and clicks on to its advertising partners. Uses the catalog's AddFirefoxPrefs function, so it
- **Disable Chrome browsing history collection** - macos.yaml, privacy, `standard`. macOS has zero Chrome hardening in the catalog today (only cache/history cleanup). This adds the first entry plus a "Configure Chrome" category with an honest note about how Chrome policy works on macOS, using the same /

### Windows performance (1)

- **Disable transparency effects** - windows.yaml, performance, not recommended (opt-in only). Microsoft states directly that "rendering acrylic surfaces is GPU intensive, which can increase device power consumption and shorten battery life", and documents that acrylic plus every system backdrop material falls bac

### macOS (10)

- **Disable Enhanced Visual Search in Photos** - macos.yaml, privacy, `strict`. Stops Photos from contacting Apple about the content of your own photo library. macOS 15 and 26 detect candidate landmarks on device and then query a global index on Apple's servers; the feature is on by default and the
- **Disable search data sharing with Apple** - macos.yaml, privacy, `standard`. Opts out of Apple storing and reviewing the searches you make in Spotlight, Safari, Siri and Look Up. The catalog only covers the Siri/Dictation opt-in status and the Look Up suggestions switch; this is the separate "Imp
- **Enable Safari advanced tracking and fingerprinting protection for all browsing** - macos.yaml, privacy, `standard`. Extends Safari's strongest anti-tracking layer (link tracking-parameter removal, known-fingerprinting-script blocking, simplified system configuration reporting) from Private Browsing windows to every window.
- **Disable Safari ad effectiveness measurement** - macos.yaml, privacy, `strict`. Stops Safari from generating and sending Private Click Measurement attribution reports, so ad clicks and later conversions are no longer reported back to the advertising and destination sites.
- **Disable Apple Pay availability checks in Safari** - macos.yaml, privacy, `strict`. Stops any web page from querying whether Apple Pay or Apple Card is available on the device. That answer is a stable device and account property, so it both identifies Apple hardware and adds a bit to a browser fingerpri
- **Disable AirPlay receiver** - macos.yaml, hardening, `strict`. Stops the Mac from running an AirPlay listening service and from advertising itself, together with its computer name, over Bonjour and Apple Wireless Direct Link on every network you join. Closes an inbound network surfa
- **Disable assistive voice recording sharing** - macos.yaml, privacy, `standard`. Opts out of the separate "Improve Assistive Voice Features" consent, which lets Apple store and review audio and transcripts of Voice Control and vocal-shortcut interactions. Turning off Siri does not cover this channel.
- **Enable secure keyboard entry in Terminal** - macos.yaml, hardening, `standard`. Makes Terminal request keystrokes through a protected channel, so other processes that hold accessibility or input-monitoring rights can no longer read what you type — including sudo passwords, SSH passphrases and API to
- **Clear Time Machine local snapshots** - macos.yaml, privacy, not recommended (opt-in only). Deletes the APFS snapshots that Time Machine leaves on the disk it backs up. Until they are removed, every file you deleted is still readable inside a snapshot on your own disk, which defeats emptying the trash and shred
- **Configure Touch ID for administrator authentication in the terminal** - macos.yaml, hardening, not recommended (opt-in only). Replaces typing your administrator password at a sudo prompt with a Secure Enclave fingerprint check, so no reusable secret is entered where onlookers, shell history or an input-monitoring program can capture it. Uses Ap

### Linux (12)

- **Disable mDNS and LLMNR name resolution** - linux.yaml, privacy, `strict`. systemd-resolved stops answering and stops broadcasting multicast name queries, so the machine no longer announces its hostname and addresses to every other device on the networks it joins, and no longer leaks the names
- **Disable Avahi network service discovery** - linux.yaml, privacy, not recommended (opt-in only). Stops the always-on mDNS/DNS-SD responder that tells every other device on the LAN (hotel, café, office Wi-Fi) that your machine exists, what its hostname and addresses are, and which services applications registered wit
- **Disable storage of crash memory dumps** - linux.yaml, privacy, `standard`. Core dumps are a verbatim copy of a crashed program's memory: typed passwords, decrypted documents, session cookies, keys. With `Storage=none` plus `ProcessSizeMax=0` — the exact combination the man page documents — cras
- **Minimize system log retention** - linux.yaml, privacy, `standard`. `MaxRetentionSec=` defaults to 0, i.e. age-based deletion is off, so the journal keeps a detailed timeline of programs started, devices plugged in, networks joined and failed logins for as long as its disk quota allows —
- **Disable repository usage counting in DNF** - linux.yaml, privacy, `standard`. Fedora currently has zero telemetry entries in the collection. DNF appends `countme=N` to one metadata request per week, where N is the age bucket of the installation derived from the mtime of /etc/machine-id — combined
- **Disable Ubuntu Pro APT news** - linux.yaml, privacy, `standard`. The Ubuntu Pro client, installed by default on Ubuntu, fetches `https://motd.ubuntu.com/aptnews.json` and prints promotional messages in `apt upgrade` output. Every fetch reveals your IP address and roughly how often you
- **Disable ICMP redirect messages** - linux.yaml, hardening, `standard`. A host with forwarding disabled (every desktop/laptop) accepts ICMP redirects by default, so anyone on the same segment can forge a redirect and route your traffic through a machine they control. secure_redirects also de
- **Disable rarely used network protocols** - linux.yaml, hardening, `standard`. An unprivileged program can make the kernel auto-load dccp, sctp, rds or tipc simply by requesting a socket of that family, pulling rarely audited kernel code into a running system on demand. The collection currently has
- **Disable KDE file indexing (Baloo)** - linux.yaml, privacy, not recommended (opt-in only). KDE users are currently served by exactly one entry in the whole collection. Baloo indexes extracted text content of your home directory into ~/.local/share/baloo/index — a searchable copy of your documents that ends up
- **Disable GNOME file content indexing** - linux.yaml, privacy, not recommended (opt-in only). GNOME's localsearch (formerly Tracker Miners) extracts text and metadata from your documents into a local database; the upstream default for the crawl list is ['$HOME'], i.e. your whole home directory recursively. This e
- **Improve protection against file hijacking in shared folders** - linux.yaml, hardening, `standard`. Raises fs.protected_regular and fs.protected_fifos from the systemd-shipped default of 1 to 2, extending the O_CREAT refusal from world-writable sticky directories to group-writable sticky directories. Closes the remaini
- **Harden the eBPF just-in-time compiler** - linux.yaml, hardening, not recommended (opt-in only). net.core.bpf_jit_harden defaults to 0 (no hardening). Setting 2 blinds the constants the JIT emits for all users, defeating JIT spraying, and additionally disables bpf_jit_kallsyms address export. Complements the existin
