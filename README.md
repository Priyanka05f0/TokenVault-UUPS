# TokenVault-UUPS

A production-grade upgradeable smart contract system built using the **UUPS (Universal Upgradeable Proxy Standard)** pattern.  
This project demonstrates secure initialization, role-based access control, storage layout preservation, and safe multi-version upgrades from **V1 → V2 → V3**.

---

## 🧩 Architecture Overview

This system follows the **UUPS proxy pattern** provided by OpenZeppelin.

```
User / DApp
|
v
+-------------------+
| UUPS Proxy | <-- Stores ALL contract state
+-------------------+
|
| delegatecall
v
+-------------------+
| Implementation | TokenVaultV1 / V2 / V3
| (Logic Contract) | <-- Business logic only
+-------------------+
```
---

### How It Works

- **Proxy Contract**
  - Stores all state variables (balances, roles, deposits, etc.)
  - Remains at the **same address forever**
- **Implementation Contract**
  - Contains only logic
  - Can be replaced via `upgradeTo()` by authorized roles
- **State Preservation**
  - Storage is never reset during upgrades
  - New versions append variables without modifying old layout

---

## Versions

### TokenVaultV1
**Core functionality**
- ERC20 token deposit & withdrawal
- Deposit fee deduction
- User balance tracking
- Role-based access control
- Upgrade authorization using UUPS

### TokenVaultV2
**Enhancements**
- Yield generation
- Per-user yield claiming
- Pause / unpause deposits
- New roles for pausing
- Storage gap preserved for future upgrades

### TokenVaultV3
**Advanced controls**
- Withdrawal request system
- Time-delayed withdrawals
- Emergency withdrawals for admin
- Strict enforcement of access control
- No storage collisions across versions

---

## Access Control Design

The system uses **OpenZeppelin AccessControl** with the following roles:

| Role | Description |
|------|------------|
`DEFAULT_ADMIN_ROLE` | Can grant/revoke roles |
`UPGRADER_ROLE` | Can perform contract upgrades |
`PAUSER_ROLE` | Can pause/unpause deposits (V2+) |
`ADMIN_ROLE` | Can perform emergency withdrawals (V3) |

**Why role-based control?**
- Prevents unauthorized upgrades
- Separates operational permissions
- Protects critical system functions

---

## Storage Layout Strategy

Upgradeable contracts **must never change storage order**.

This project ensures:
- **No variable reordering**
- **No variable type changes**
- **New variables are always appended**
- **Storage gaps (`uint256[xx] private __gap`)** are reduced per version

This guarantees:
- No storage collision
- Safe state preservation across upgrades

---

## Upgrade Mechanism (UUPS)

- Each implementation inherits:
  - `UUPSUpgradeable`
  - `AccessControlUpgradeable`
  - `Initializable`
- Upgrade authorization is enforced via:
```solidity
function _authorizeUpgrade(address newImplementation)
    internal override onlyRole(UPGRADER_ROLE)
{}
```

### Upgrade Flow

1. Proxy delegates to current implementation
2. Admin calls upgradeTo(newImplementation)
3. Proxy switches logic but keeps state intact

---

### Security Measures

✔ Reinitialization protection using initializer
✔ disableInitializers() in constructors
✔ Unauthorized upgrades blocked
✔ Storage collision prevention
✔ Role-restricted sensitive operations
✔ Emergency withdrawal with admin-only access

---

### Testing Strategy

The test suite verifies:
- V1 functionality
- V1 → V2 upgrade safety
- V2 → V3 upgrade safety
- Balance preservation across upgrades
- Access control enforcement
- Emergency and delayed withdrawals
- Security vulnerabilities (initialization, unauthorized upgrades, selector clashes)

#### Run Tests
```bash
npx hardhat test
```
All required tests pass with full upgrade coverage.

---

### Installation & Setup
```bash
npm install
```
---

### Compile Contracts
```bash
npx hardhat compile
```
---

## Deployment & Upgrade
### Deploy V1
```bash
npx hardhat run scripts/deploy-v1.js --network localhost
```

### Upgrade to V2
```bash
npx hardhat run scripts/upgrade-to-v2.js --network localhost
```

### Upgrade to V3
```bash
npx hardhat run scripts/upgrade-to-v3.js --network localhost
```

### Example Interaction
```bash 
npx hardhat console --network localhost
```
```js
const TokenVault = await ethers.getContractFactory("TokenVaultV3");
const vault = await TokenVault.attach("PROXY_ADDRESS");

const [user] = await ethers.getSigners();

// Check balance
await vault.balanceOf(user.address);

// Deposit tokens
await vault.deposit(100);

// Request withdrawal
await vault.requestWithdrawal(50);

// Execute after delay
await vault.executeWithdrawal();
```
---

### Known Limitations & Design Decisions

- No front-end UI (CLI interaction only)
- Yield calculation is linear (no compounding)
- Emergency withdrawal is centralized to admin role
- Designed for educational and audit-ready demonstration, not mainnet deployment

---

### Project Structure
```
```
TokenVault-UUPS/
├── contracts/
│   ├── TokenVaultV1.sol
│   ├── TokenVaultV2.sol
│   ├── TokenVaultV3.sol
│   └── mocks/
│       └── MockERC20.sol
├── test/
│   ├── TokenVaultV1.test.js
│   ├── upgrade-v1-to-v2.test.js
│   ├── upgrade-v2-to-v3.test.js
│   └── security.test.js
├── scripts/
│   ├── deploy-v1.js
│   ├── upgrade-to-v2.js
│   └── upgrade-to-v3.js
├── hardhat.config.js
├── package.json
├── submission.yml
└── README.md

---

### Submission Readiness

- UUPS upgrade pattern
- Role-based access control
- Secure initialization
- Storage layout preservation
- Multi-version upgrades
- Automated tests passing
- Documentation complete