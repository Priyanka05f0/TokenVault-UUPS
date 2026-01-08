// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./TokenVaultV2.sol";

contract TokenVaultV3 is TokenVaultV2 {

    // Withdrawal delay in seconds
    uint256 private withdrawalDelay;

    // Track pending withdrawal requests
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTime;
    }

    mapping(address => WithdrawalRequest) private withdrawalRequests;

    /**
     * @notice Set withdrawal delay (admin only)
     */
    function setWithdrawalDelay(uint256 _delay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        withdrawalDelay = _delay;
    }

    /**
     * @notice Get withdrawal delay
     */
    function getWithdrawalDelay() external view returns (uint256) {
        return withdrawalDelay;
    }

    /**
     * @notice Request a withdrawal (must wait before execution)
     */
    function requestWithdrawal(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        withdrawalRequests[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestTime: block.timestamp
        });
    }

    /**
     * @notice Execute a previously requested withdrawal after delay
     */
    function executeWithdrawal() external {
        WithdrawalRequest memory req = withdrawalRequests[msg.sender];
        require(req.amount > 0, "No withdrawal requested");
        require(
            block.timestamp >= req.requestTime + withdrawalDelay,
            "Withdrawal delay not passed"
        );

        // Clear request
        delete withdrawalRequests[msg.sender];

        balances[msg.sender] -= req.amount;
        _totalDeposits -= req.amount;

        require(token.transfer(msg.sender, req.amount), "Token transfer failed");
    }

    /**
     * @notice Emergency withdraw by admin (no delay)
     */
    function emergencyWithdraw(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = balances[user];
        require(amount > 0, "No balance");

        balances[user] = 0;
        _totalDeposits -= amount;

        // Clear any pending request
        delete withdrawalRequests[user];

        require(token.transfer(user, amount), "Token transfer failed");
    }

    /**
     * @notice Version identifier
     */
    function getImplementationVersion() external pure override returns (string memory) {
        return "V3";
    }
}
