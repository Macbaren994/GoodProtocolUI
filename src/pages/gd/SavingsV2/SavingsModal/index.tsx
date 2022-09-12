import React, { useState, useReducer, useEffect, memo } from 'react'
import { ethers } from 'ethers'

import Modal from 'components/Modal/'
import { StakeDepositSC } from 'pages/gd/Stake/StakeDeposit/styled'
import Title from 'components/gd/Title'
import SwapInput from 'pages/gd/Swap/SwapInput'
import PercentInputControls from 'components/Withdraw/PercentInputControls'

import { useDispatch } from 'react-redux'
import type { Action } from 'pages/gd/Stake/StakeDeposit'
import { addTransaction } from 'state/transactions/actions'

import { useLingui } from '@lingui/react'
import { t } from '@lingui/macro'

import Loader from 'components/Loader'
import { ButtonAction } from 'components/gd/Button'

import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useG$Balance, useSavingsFunctions } from '@gooddollar/web3sdk-v2'
import { TransactionReceipt } from '@ethersproject/providers'
import { TransactionStatus } from '@usedapp/core'

// TODO: Change to savings specific state
const initialState = {
  token: 'A' as 'A' | 'B',
  value: '',
  dollarEquivalent: undefined as undefined | string,
  approved: false,
  signed: false,
  loading: false,
  error: undefined as undefined | string,
  done: false,
  transactionHash: undefined as undefined | string
}

const TransactionCopy = {
  deposit: {
    title: {
      init: 'Deposit to Savings Account',
      loading: 'Depositing. . .',
      done: 'Well Done!'
    },
    action: 'Deposit to',
    transaction: {
      summary: 'G$ deposited to savings',
    }
  },
  withdraw: {
    title: {
      init: 'Withdraw from Savings account',
      loading: 'Withdrawing. . .',
      done: 'Success',
    },
    transaction: {
      summary: 'G$ withdrawn from savings',
    }
  },
  claim: {
    title: {
      init: 'Claim Rewards',
      loading: 'Claiming. . .',
      done: 'Success'
    },
    transaction: {
      summary: 'Claimed savings rewards'
    }
  }
}

export type ModalType = 'deposit' | 'withdraw' | 'claim'

const SavingsModal = (
  {type, network, toggle, isOpen}: 
  {type: ModalType, network: string, toggle: () => void, isOpen: boolean}):JSX.Element => {
  const { i18n } = useLingui()
  const { chainId, account } = useActiveWeb3React() 
  const [balance, setBalance] = useState<string>('0')
  const [txStatus, setTxStatus] = useState<TransactionStatus>({status: 'None'})
  const reduxDispatch = useDispatch()
  
  const { g$Balance, savingsBalance } = useG$Balance(10, network)

  const [percentage, setPercentage] = useState<string>('50')
  const [withdrawAmount, setWithdrawAmount] = useState<number>(parseInt(savingsBalance) * (Number(percentage) / 100))

  useEffect(() => {
      setBalance(type === 'withdraw' ? savingsBalance : g$Balance)
      if (type === 'withdraw'){
        setWithdrawAmount(parseFloat(savingsBalance) * (Number(percentage) / 100))
      }
  }, [g$Balance, savingsBalance, type, percentage])

  const {
    transfer,
    withdraw,
    claim,
    transferState,
    withdrawState,
    claimState
  } = useSavingsFunctions(network)

  const addSavingsTransaction = async (tx: TransactionReceipt, amount?: string) => {
    dispatch({type: 'DONE', payload: tx.transactionHash})
    reduxDispatch(
      addTransaction({
        chainId: 122, // todo: move back to chainId
        hash: tx.transactionHash,
        from: tx.from,
        summary: i18n._(t`${amount} ${TransactionCopy[type].transaction.summary}`)
      })
    )
  }
  
  const depositOrWithdraw = async (amount:string) => {
    if (account) {
      const parsedAmount = (parseFloat(withdrawAmount.toFixed(2)) * 1e2).toString()
      const tx = type === 'withdraw' ? 
        await withdraw(parsedAmount) : 
        await transfer((parseFloat(amount) * 1e2).toString())

      if (tx){
        addSavingsTransaction(tx, amount)  
        return        
      }
    }
  }

  const claimRewards = async () => {
    if (account) {
      await claim().then((tx) => {
        if (tx) {
          addSavingsTransaction(tx)
        }
      })
    }
  }

  const withdrawAll = async () => {
    if (account) {
      const tx = await withdraw(savingsBalance, account)
      if (tx) {
        addSavingsTransaction(tx, savingsBalance)
      }
    }
  }

  //NOTE-TO-SELF/RB4C -- Think of cleaner solution
  useEffect(() => {
    if (type === 'deposit'){
      setTxStatus(transferState)
    } else if (type === 'withdraw') {
      setTxStatus(withdrawState)
    } else {
      setTxStatus(claimState)
    }
  }, [transferState, withdrawState, claimState, type])

  // TODO: specify towards savings save flow
  const [state, dispatch] = useReducer(
    (
        state: typeof initialState,
        action:
            | Action<'TOGGLE_INIT'>
            | Action<'TOGGLE_TOKEN', boolean>
            | Action<'TOGGLE_LOADING'>
            | Action<'CHANGE_VALUE', string>
            | Action<'SET_ERROR', Error>
            | Action<'DONE', string>
    ) => {
        switch (action.type) {
            case 'TOGGLE_INIT': 
              return {
                  ...state,
                  error: undefined,
                  loading: false,
                  done: false,
                  signed: false,
                  transactionHash: undefined
              }
            case 'TOGGLE_TOKEN':
                return {
                    ...state,
                    token: action.payload ? ('B' as const) : ('A' as const)
                }
            case 'CHANGE_VALUE':
                return {
                    ...state,
                    value: action.payload
                }
            case 'TOGGLE_LOADING':
                return {
                    ...state,
                    error: state.loading ? state.error : undefined,
                    loading: !state.loading
                }
            case 'SET_ERROR':
                return {
                    ...state,
                    error: action.payload.message
                }
            case 'DONE':
                return {
                    ...state,
                    done: true,
                    // In case CHANGE_SIGNED is not triggered
                    signed: true,
                    transactionHash: action.payload
                }
        }
    },
    initialState
  )

  const withLoading = async (cb: Function) => {
    try {
        dispatch({ type: 'TOGGLE_LOADING' })
        await cb()
    } catch (e) {
      console.log('toggle loading error', {e})
      dispatch({
          type: 'SET_ERROR',
          payload: e as Error
      })
    } finally {
      dispatch({ type: 'TOGGLE_LOADING' })
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={() => {
      dispatch({ type: 'TOGGLE_INIT' })
      toggle()
      }}>
        <StakeDepositSC style={{
          // display: 'flex',
          // justifyContent: 'center',
          // flexDirection: 'column'
        }}>
          <Title className="flex items-center justify-center mb-2 space-x-2" style={{fontSize: '24px'}}>
            { state.loading && !state.done ? i18n._(t`${TransactionCopy[type].title.loading}`) :
              state.done ? i18n._(t`${TransactionCopy[type].title.done}`) :
              i18n._(t`${TransactionCopy[type].title.init}`)
            }
          </Title>
            {
              txStatus.status === 'Exception' && txStatus.errorMessage && (
                <div className='flex justify-center mb-2 error'>{txStatus.errorMessage}</div>
              )
            }
          {
            state.loading && !state.done ? 
            (
              <div id="LoadingScreen" style={{display: 'flex', justifyContent: 'center'}}>
                <Loader stroke="#173046" size="32px" />
              </div>
            ) : state.done ? (
              <div id="SuccessScreen">
                {i18n._(t`Your ${type} transaction has been confirmed!`)}
              </div>
            ) :
            <div>
              {type !== 'claim' &&                   
                <div className="flex flex-col mb-4">
                    {
                      type === 'deposit' ?
                      <>
                        <span>How much would you like to {type}</span> 
                        <SwapInput
                          balance={balance}
                          autoMax
                          disabled={state.loading}
                          value={state.value}
                          onMax={() => {
                            dispatch({
                                type: 'CHANGE_VALUE',
                                payload: balance ?? '0' //todo: format balances
                            })
                          }}
                          onChange={e =>
                            dispatch({
                                type: 'CHANGE_VALUE',
                                payload: e.currentTarget.value
                            })
                          }
                        />
                      </> :
                      <PercentInputControls
                        value={percentage}
                        onPercentChange={setPercentage} 
                      />
                    }
                </div>
              }
              <div>
                <ButtonAction 
                  className={"claim-reward"}
                  style={{   
                  borderRadius: '5px',
                  padding: '5px',
                  marginTop: '10px'
                }} onClick={() => {
                  withLoading(async () => {
                    if (type === 'claim'){
                      await claimRewards()
                    } else {
                      percentage === '100' ?
                      await withdrawAll() :
                      await depositOrWithdraw(state.value)
                    }
                  })
                }}> 
                  {type} {' '} 
                  {type === 'withdraw' ? withdrawAmount.toFixed(2) + ' G$ ' : ''} 
                </ButtonAction>
              </div>
            </div>
          }
        </StakeDepositSC>
      </Modal>
  )
}

export default memo(SavingsModal)