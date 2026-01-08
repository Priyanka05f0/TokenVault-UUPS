# TokenVault-UUPS

An upgradeable smart contract system built using the UUPS proxy pattern.

## Versions

### TokenVaultV1
- Deposit and withdraw ERC20 tokens
- Fee mechanism
- Role-based access control

### TokenVaultV2
- Yield generation
- Pause and unpause deposits
- Upgrade-safe storage

### TokenVaultV3
- Withdrawal request system
- Time delay before withdrawal
- Emergency withdraw by admin

## Upgrade Pattern

This project uses OpenZeppelin's UUPS upgrade pattern.
- Proxy stores data
- Logic contracts can be upgraded
- State is preserved across versions

## Tests

All critical scenarios are tested:
- V1 functionality
- V1 → V2 upgrade
- V2 → V3 upgrade
- Balance preservation
- Security checks

### Run tests:
```bash
npx hardhat test
```
---

####Scripts

- Deploy V1: 
```bash npx hardhat run scripts/deploy-v1.js
```
- Upgrade to V2: 
```bash npx hardhat run scripts/upgrade-to-v2.js
```
- Upgrade to V3: 
```bash
npx hardhat run scripts/     upgrade-to-v3.js
```
---

## Security

Role-based access control

Upgrade authorization

Emergency withdrawal

Pausable deposits