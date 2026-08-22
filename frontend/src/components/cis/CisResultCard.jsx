import { useState } from 'react'
import {
  HiCommandLine,
  HiClipboardDocument,
  HiClipboardDocumentCheck,
  HiChevronDown,
  HiChevronUp,
  HiExclamationCircle,
  HiCheckCircle
} from 'react-icons/hi2'
import StatusPill from '../common/StatusPill.jsx'

const REMEDIATION_SNIPPETS = {
  check_egress_default_deny: `! Configure explicit default-deny on egress ACL
ip access-list extended EGRESS_FILTER
 permit tcp any any established
 deny ip any any log
interface GigabitEthernet0/1
 ip access-group EGRESS_FILTER out`,

  check_insecure_mgmt_protocols: `! Disable Telnet and plain HTTP management
no ip http server
no ip http secure-server
line vty 0 4
 transport input ssh
 exec-timeout 15 0`,

  check_weak_snmp_community: `! Remove default weak SNMP community strings
no snmp-server community public
no snmp-server community private
! Enforce SNMPv3 encrypted credentials
snmp-server group SECURE_GRP v3 priv
snmp-server user secadmin SECURE_GRP v3 auth sha StrongAuthPass priv aes 128 StrongPrivPass`,

  check_open_ingress_sensitive_ports: `! Restrict sensitive administrative ports
ip access-list extended INGRESS_FILTER
 deny tcp any any eq 22 log
 deny tcp any any eq 23 log
 deny tcp any any eq 445 log
 deny tcp any any eq 3389 log
 permit tcp any host 10.10.0.1 eq 443`,

  check_remote_syslog_enabled: `! Enable centralized remote syslog logging
logging buffered 64000
logging host 10.10.0.50
logging trap warnings
service timestamps log datetime msec`,

  check_no_default_credentials_banner: `! Configure unauthorized legal warning banner
banner login ^C
*****************************************************************
*  WARNING: UNAUTHORIZED ACCESS TO THIS NETWORK DEVICE IS       *
*  PROHIBITED. ALL SESSIONS AND COMMANDS ARE LOGGED & MONITORED. *
*****************************************************************
^C`,

  check_ntp_configured: `! Configure authoritative NTP time servers
ntp server 10.10.0.1 prefer
ntp server 10.10.0.2
ntp authenticate`,

  check_ssh_only_mgmt: `! Enforce SSHv2 exclusively for all management lines
ip domain-name enterprise.local
crypto key generate rsa modulus 2048
ip ssh version 2
line vty 0 4
 transport input ssh`
}

export default function CisResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const isPass = result.status === 'PASS'
  const remediation = REMEDIATION_SNIPPETS[result.check_id]

  const handleCopyRemediation = (e) => {
    e.stopPropagation()
    if (!remediation) return
    navigator.clipboard.writeText(remediation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`glass-card glass-card-hover rounded-2xl p-5 border transition-all ${
        isPass
          ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
          : 'border-rose-200 bg-rose-50/20 hover:border-rose-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isPass ? (
              <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <HiExclamationCircle className="h-5 w-5 shrink-0 text-rose-500" />
            )}
            <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              {result.title}
            </h4>
          </div>
          <span className="mono inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 mt-1.5">
            {result.cis_reference}
          </span>
        </div>
        <StatusPill status={result.status} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        {result.evidence}
      </p>

      {result.affected_items?.length > 0 && (
        <div className="mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1.5">
            Flagged Offending Lines / Ports:
          </span>
          <div className="space-y-1">
            {result.affected_items.map((item, index) => (
              <div
                key={index}
                className="mono truncate rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs text-rose-800 font-medium"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPass && remediation && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <HiCommandLine className="h-4 w-4" />
              <span>{expanded ? 'Hide Cisco CLI Remediation' : 'View Cisco CLI Remediation'}</span>
              {expanded ? <HiChevronUp className="h-3.5 w-3.5" /> : <HiChevronDown className="h-3.5 w-3.5" />}
            </button>

            {expanded && (
              <button
                onClick={handleCopyRemediation}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                {copied ? (
                  <>
                    <HiClipboardDocumentCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <HiClipboardDocument className="h-3.5 w-3.5" />
                    <span>Copy Fix</span>
                  </>
                )}
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-2.5">
              <pre className="mono overflow-x-auto rounded-xl bg-slate-900 p-3.5 text-[11px] leading-relaxed text-emerald-400 border border-slate-800 shadow-inner">
                {remediation}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



