// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./TokenVaultV1.sol";

contract TokenVaultV2 is TokenVaultV1 {

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Yield rate in basis points (e.g., 500 = 5% annually)
    uint256 private yieldRate;

    // Track last yield claim time per user
    mapping(address => uint256) private lastClaimTime;

    // Pause flag for deposits
    bool private depositsPaused;

    /**
     * @notice Set yield rate (admin only)
     */
    function setYieldRate(uint256 _yieldRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldRate = _yieldRate;
    }

    /**
     * @notice Get current yield rate
     */
    function getYieldRate() external view returns (uint256) {
        return yieldRate;
    }

    /**
     * @notice Get user's pending yield
     */
    function getUserYield(address user) public view returns (uint256) {
        if (balances[user] == 0) {
            return 0;
        }

        uint256 lastTime = lastClaimTime[user];
        if (lastTime == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - lastTime;
        uint256 yearlyYield = (balances[user] * yieldRate) / 10000;
        return (yearlyYield * timeElapsed) / 365 days;
    }

    /**
     * @notice Claim accumulated yield
     */
    function claimYield() external returns (uint256) {
        // Initialize lastClaimTime for V1 users on first claim
        if (lastClaimTime[msg.sender] == 0) {
            lastClaimTime[msg.sender] = block.timestamp;
            return 0;
        }

        uint256 yieldAmount = getUserYield(msg.sender);
        require(yieldAmount > 0, "No yield available");

        lastClaimTime[msg.sender] = block.timestamp;
        balances[msg.sender] += yieldAmount;
        _totalDeposits += yieldAmount;

        return yieldAmount;
    }

    /**
     * @notice Pause deposits
     */
    function pauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = true;
    }

    /**
     * @notice Unpause deposits
     */
    function unpauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = false;
    }

    /**
     * @notice Check if deposits are paused
     */
    function isDepositsPaused() external view returns (bool) {
        return depositsPaused;
    }

    /**
     * @notice Override deposit to respect pause
     */
    function deposit(uint256 amount) public override {
        require(!depositsPaused, "Deposits are paused");
        super.deposit(amount);

        // Initialize yield tracking if first time
        if (lastClaimTime[msg.sender] == 0) {
            lastClaimTime[msg.sender] = block.timestamp;
        }
    }

    /**
     * @notice Version identifier
     * MUST be virtual so V3 can override it
     */
    function getImplementationVersion() external pure virtual override returns (string memory) {
        return "V2";
    }
}
