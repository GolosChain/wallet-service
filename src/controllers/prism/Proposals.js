const Utils = require('../../utils/Utils');
const DelegateVestingProposal = require('../../models/DelegateVestingProposal');

class Proposals {
    async disperseAction(action, transaction) {
        if (action.receiver !== action.code) {
            return;
        }

        const method = `${action.code}->${action.action}`;

        switch (method) {
            case 'cyber.msig->propose':
                await this._handleNewProposal(action.args);
                break;
            case 'cyber.msig->approve':
            case 'cyber.msig->unapprove':
                await this._handleProposalApprove(action.args, action.action);
                break;
            case 'cyber.msig->exec':
            case 'cyber.msig->cancel':
                await this._handleProposalClose(action.args);
                break;
        }
    }

    async _handleNewProposal({ proposer, proposal_name: proposalId, requested, trx }) {
        // Обрабатываем пропозалы содержащие одно действие, на сайте создаем именно такие.
        if (trx.actions.length !== 1) {
            return;
        }

        const proposal = {
            proposer,
            proposalId,
            requested: requested.map(({ actor, permission }) => ({
                userId: actor,
                permission,
            })),
        };

        const action = trx.actions[0];
        const [communityId, type] = action.account.split('.');
        const pathName = `${type}->${action.name}`;

        switch (pathName) {
            case 'vesting->delegate':
                const expiration = new Date(trx.expiration + 'Z');
                const [{ data }] = await Utils.getCyberApi().deserializeActions(trx.actions);

                await this._handleDelegateProposal({
                    proposal,
                    communityId,
                    data,
                    expiration,
                });
                break;
            default:
            // Do nothing
        }
    }

    async _handleDelegateProposal({ proposal, communityId, data, expiration }) {
        await DelegateVestingProposal.create({
            communityId,
            proposer: proposal.proposer,
            proposalId: proposal.proposalId,
            userId: data.from,
            toUserId: data.to,
            requested: proposal.requested,
            isSignedByAuthor: false,
            expiration,
            data: {
                quantity: data.quantity,
                interestRate: data.interest_rate,
            },
        });
    }

    async _handleProposalApprove({ proposer, proposal_name: proposalId, level }, actionName) {
        const proposal = await DelegateVestingProposal.findOne(
            {
                proposer,
                proposalId,
            },
            {
                _id: true,
                userId: true,
            },
            {
                lean: true,
            }
        );

        if (!proposal) {
            return;
        }

        if (proposal.userId === level.actor) {
            await DelegateVestingProposal.updateOne(
                { _id: proposal._id },
                {
                    $set: {
                        isSignedByAuthor: actionName === 'approve',
                    },
                }
            );
        }
    }

    async _handleProposalClose({ proposer, proposal_name: proposalId }) {
        await DelegateVestingProposal.deleteOne({
            proposer,
            proposalId,
        });
    }
}

module.exports = Proposals;
