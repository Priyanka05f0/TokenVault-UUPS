// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVaultV1 is Initializable, UUPSUpgradeable, AccessControlUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ERC20 token used for deposits
    IERC20 internal token;

    // Deposit fee in basis points (100 = 1%)
    uint256 internal depositFee;

    // User balances
    mapping(address => uint256) internal balances;

    // Total deposits after fee deduction
    uint256 internal _totalDeposits;

    // Storage gap for future upgrades
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the vault
     * @param _token ERC20 token address
     * @param _admin Admin address
     * @param _depositFee Deposit fee in basis points
     */
    function initialize(
        address _token,
        address _admin,
        uint256 _depositFee
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_token != address(0), "Invalid token");
        require(_admin != address(0), "Invalid admin");

        token = IERC20(_token);
        depositFee = _depositFee;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    /**
     * @notice Deposit tokens into the vault
     */
    function deposit(uint256 amount) public virtual {
        require(amount > 0, "Amount must be > 0");

        uint256 fee = (amount * depositFee) / 10000;
        uint256 credited = amount - fee;

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        balances[msg.sender] += credited;
        _totalDeposits += credited;
    }

    /**
     * @notice Withdraw tokens from the vault
     */
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        _totalDeposits -= amount;

        require(token.transfer(msg.sender, amount), "Token transfer failed");
    }

    /**
     * @notice Get balance of a user
     */
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    /**
     * @notice Get total deposits in the vault
     */
    function totalDeposits() external view returns (uint256) {
        return _totalDeposits;
    }

    /**
     * @notice Get current deposit fee
     */
    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }

    /**
     * @notice Get implementation version
     */
    function getImplementationVersion() external pure virtual returns (string memory) {
        return "V1";
    }

    /**
     * @dev UUPS upgrade authorization
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
