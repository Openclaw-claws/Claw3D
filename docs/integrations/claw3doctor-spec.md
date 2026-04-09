# Claw3Doctor Spec

> First-pass diagnostics plan for Claw3D deployments so users stop chasing the same setup failures manually.

## Goal

Provide a single diagnostics surface for the common "Claw3D cannot connect"
or "runtime support looks broken" cases.

The intent is similar to:

- `openclaw doctor`
- `hermes doctor`

but focused on Claw3D's integration points across providers.

## Primary Outcomes

`claw3doctor` should:

- identify the selected runtime profile/provider
- verify the gateway is reachable
- identify common auth/config mistakes
- surface provider-specific hints without making the whole app provider-specific
- reduce issue-thread back-and-forth

## V1 Delivery Boundary

`claw3doctor` v1 should be considered complete when it provides:

- selected-profile diagnostics with optional per-profile probing
- grouped terminal output with clear pass / warn / fail results
- JSON output for automation and issue reporting
- provider-aware checks for OpenClaw, Hermes, demo, local, claw3d, and custom runtimes
- common failure classification for transport and auth problems
- concrete remediation for local, remote, tunneled, and adapter-backed setups
