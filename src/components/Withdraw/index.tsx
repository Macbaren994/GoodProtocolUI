import React from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { ReactComponent as LinkSVG } from 'assets/images/link-blue.svg'
import { ReactComponent as CrossSVG } from 'assets/images/x.svg'
import Button from 'components/Button'
import { ButtonAction } from 'components/gd/Button'
import Title from 'components/gd/Title'
import Loader from 'components/Loader'
import Modal from 'components/Modal'
import Switch from 'components/Switch'
import PercentInputControls from 'components/Withdraw/PercentInputControls'
import { WithdrawStyled } from 'components/Withdraw/styled'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import useActiveWeb3React from '../../hooks/useActiveWeb3React'
import { addTransaction } from '../../state/transactions/actions'
import { getExplorerLink } from '../../utils'

import { LIQUIDITY_PROTOCOL, MyStake, SupportedChainId, useGdContextProvider, withdraw } from '@gooddollar/web3sdk'
import useSendAnalyticsData from 'hooks/useSendAnalyticsData'

function formatNumber(value: number) {
    return Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 4 }).format(value)
}

interface WithdrawProps {
    token: string
    protocol: string
    open: boolean
    setOpen: (value: boolean) => void
    onWithdraw: () => void
    stake: MyStake
}

type WithdrawState = 'none' | 'pending' | 'send' | 'success'

const Withdraw = memo(({ token, protocol, open, setOpen, onWithdraw, stake, ...rest }: WithdrawProps) => {
    const { i18n } = useLingui()
    const [status, setStatus] = useState<WithdrawState>('none')
    const totalStake = useMemo(() => parseFloat(stake.stake.amount.toExact()), [stake])
    const [withdrawInInterestToken, setWithdrawInInterestToken] = useState(false)
    const { web3 } = useGdContextProvider()
    const [percentage, setPercentage] = useState<string>('50')
    const [withdrawAmount, setWithdrawAmount] = useState<number>(totalStake * (Number(percentage) / 100))
    const { chainId } = useActiveWeb3React()
    const network = SupportedChainId[chainId]
    const [error, setError] = useState<Error>()
    const sendData = useSendAnalyticsData()

    const isGovStake = protocol === LIQUIDITY_PROTOCOL.GOODDAO

    useEffect(() => {
        setWithdrawAmount(totalStake * (Number(percentage) / 100))
    }, [percentage])
    const dispatch = useDispatch()
    const [transactionHash, setTransactionHash] = useState<string>()

    const handleWithdraw = useCallback(async () => {
        if (!web3) return
        try {
            setStatus('pending')
            sendData({
                event: 'stake',
                action: 'stake_withdraw_confirm',
                amount: withdrawAmount,
                type: protocol,
                network,
            })
            await withdraw(
                web3,
                stake,
                percentage,
                !isGovStake && withdrawInInterestToken,
                (transactionHash: string, from: string) => {
                    setTransactionHash(transactionHash)
                    setStatus('send')
                    sendData({
                        event: 'stake',
                        action: 'stake_withdraw_success',
                        amount: withdrawAmount,
                        type: protocol,
                        network,
                    })
                    dispatch(
                        addTransaction({
                            chainId: chainId!,
                            hash: transactionHash,
                            from: from,
                            summary: i18n._(t`Withdrew funds from ${stake.protocol} `),
                        })
                    )
                },
                () => {
                    setStatus('success')
                },
                (e) => {
                    setStatus('none')
                    setError(e as Error)
                }
            )
            onWithdraw()
        } catch (e) {
            console.error(e)
            setStatus('none')
        }
    }, [
        setStatus,
        onWithdraw,
        setError,
        percentage,
        withdrawAmount,
        isGovStake,
        withdrawInInterestToken,
        chainId,
        i18n,
    ])

    const handleClose = useCallback(() => {
        setStatus('none')
        setOpen(false)
    }, [])

    useEffect(() => {
        if (open) setPercentage('50')
        if (open && status !== 'none') {
            setStatus('none')
            setTransactionHash(undefined)
        }
    }, [open])

    return (
        <Modal isOpen={open} noPadding onDismiss={handleClose}>
            <WithdrawStyled {...rest}>
                <div className="flex justify-end flex-grow">
                    <CrossSVG className="cursor-pointer" onClick={handleClose} />
                </div>
                {status === 'none' || status === 'pending' ? (
                    <>
                        <Title className="flex justify-center flex-grow pt-3 pb-3">{i18n._(t`Withdraw`)}</Title>
                        <div className="flex justify-between details-row">
                            <div>{i18n._(t`Token`)}</div>
                            <div>{token}</div>
                        </div>
                        <div className="flex justify-between details-row">
                            <div>{i18n._(t`Protocol`)}</div>
                            <div>{protocol}</div>
                        </div>
                        <div className="flex justify-between details-row">
                            <div>{i18n._(t`Total stake`)}</div>
                            <div>{`${formatNumber(totalStake)} ${token}`}</div>
                        </div>

                        <div className="mt-4 mb-2 horizontal" />
                        {!isGovStake && (
                            <div className="flex justify-between mb-2 details-row">
                                <div>{i18n._(t`Withdraw as ${stake.tokens.B.symbol || 'interest token'}?`)}</div>
                                <Switch checked={withdrawInInterestToken} onChange={setWithdrawInInterestToken} />
                            </div>
                        )}
                        <PercentInputControls
                            value={percentage}
                            onPercentChange={setPercentage}
                            disabled={status === 'pending'}
                        />

                        <div className="relative flex flex-col items-center gap-1 mt-7">
                            <p className="mb-5 warning">{error ? error.message : ''}</p>
                            {!isGovStake && (
                                <p className="mb-2 text-center warning text-red">
                                    {i18n._(t`Withdrawing your stake will reset your multiplier.`)}
                                </p>
                            )}
                            <ButtonAction className="withdraw" disabled={status === 'pending'} onClick={handleWithdraw}>
                                {status === 'pending'
                                    ? i18n._(t`PENDING SIGN...`)
                                    : `${i18n._(t`WITHDRAW`)} ${formatNumber(withdrawAmount)} ${token.toUpperCase()}`}
                            </ButtonAction>
                            {status === 'pending' && (
                                <p className="pending-hint">You need to sign the transaction in your wallet</p>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <Title className="flex justify-center flex-grow pt-3">
                            {status === 'send' ? i18n._(t`Please wait`) : i18n._(t`Success!`)}
                        </Title>
                        <div className="flex items-center justify-center gap-2 pt-7 pb-7">
                            {status === 'send'
                                ? i18n._(t`Transaction was sent to the blockchain `)
                                : i18n._(t`You have successfully claimed your rewards `)}
                            <a
                                href={
                                    transactionHash &&
                                    chainId &&
                                    getExplorerLink(chainId, transactionHash, 'transaction')
                                }
                                target="_blank"
                                rel="noreferrer"
                            >
                                <LinkSVG className="cursor-pointer" />
                            </a>
                        </div>
                        <div className="flex justify-center">
                            {status === 'send' ? (
                                <Loader stroke="#173046" size="32px" />
                            ) : (
                                <Button className="back-to-portfolio" onClick={handleClose}>
                                    {i18n._(t`Back to portfolio`)}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </WithdrawStyled>
        </Modal>
    )
})

export default Withdraw
