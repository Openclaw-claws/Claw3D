# Runtime Profile Architecture

> Forward-looking runtime model for Claw3D after the OpenClaw + Hermes adapter work landed.

## Goal

Claw3D should treat runtime connection targets as profiles, not as ad hoc
gateway URLs tied to one backend assumption.

That means the app should model:

- provider
- runtime profile
- floor binding

instead of making the user think in terms of:

- one hard-coded backend
- one port
- one global gateway selection

## Recommendation

Use one gateway contract in the UI, with different backend providers
behind it.

Default path:

- `OpenClaw` is the default runtime profile

Optional paths:

- `Hermes Adapter`
- `Custom Runtime(s)`
- `Local Runtime`
- `Claw3D Runtime`

The important rule is:

- the UI keeps speaking one Claw3D gateway contract
- the backend behind that contract may be native OpenClaw, Hermes through
  the adapter, or a custom/runtime endpoint
