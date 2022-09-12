import React from 'react'
import { useStakerInfo } from '@gooddollar/web3sdk-v2'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/macro'
import { ActionOrSwitchButton } from 'components/gd/Button/ActionOrSwitchButton'
import { DAO_NETWORK, G$ } from '@gooddollar/web3sdk'
import { ModalType } from 'pages/gd/SavingsV2/SavingsModal'
import { LoadingPlaceHolder } from 'theme/components'


const errorCopy = 'Unable to fetch data, refresh, try again later or contact support if issue persists.'

//TODO: Move to components
export const SavingsCardRow = (
  {account, network, toggleModal}:
  {account:string, network:string, toggleModal:(type?:ModalType) => void}):JSX.Element => {
  const { i18n } = useLingui()
  const { stats } = useStakerInfo(30, account, network)

  return (
    <tr>
      <td>{i18n._(t`Savings`)}</td>
      <td>{i18n._(t`G$`)}</td>
      <td>{i18n._(t`GoodDAO`)}</td>
      <td>
        <div className="flex flex-col segment">
          {stats?.principle ? (<>{stats.principle.toFixed(2, {groupSeparator: ','})} {' '} G$</>) 
          : <LoadingPlaceHolder />}
        </div>  
      </td>
      <td>
        <div className="flex flex-col segment">
          {stats?.claimable ? (
              <>
                <div>{stats.claimable.g$Reward.toFixed(2, {groupSeparator: ','})}{' '} G$</div>
                <div>{stats.claimable.goodReward.toFixed(2, {groupSeparator: ','})}{' '} GOOD</div>
              </>
            ) : 
            <div className="flex flex-col">
              <div style={{width: '200px', marginBottom: '10px'}} className="flex flex-row"><LoadingPlaceHolder /></div>
              <div style={{width: '200px'}}><LoadingPlaceHolder /></div>
            </div>
          }
        </div>
      </td>
      {/* <td>
        <div className="flex flex-col segment">
            <div>{stats?.rewardsPaid.g$Minted.toFixed(2, {groupSeparator: ','})} G$</div> // will be added later
            <div>{stats?.rewardsPaid.goodMinted.toFixed(2, {groupSeparator: ','})} GOOD</div>
        </div>
      </td> */}
      <td className="flex content-center justify-center">
        <div className="flex items-end justify-center md:flex-col segment withdraw-buttons">
          <div className="h-full withdraw-button md:h-auto">
          <ActionOrSwitchButton
            width="130px"
            size="sm"
            borderRadius="6px"
            requireNetwork={DAO_NETWORK.FUSE}
            noShadow={true}
            onClick={() => {
            toggleModal('withdraw')
          }}> {i18n._(t`Withdraw G$`)} </ActionOrSwitchButton>
          <div className={"mb-1"}></div>
          <ActionOrSwitchButton
            width="130px"
            size="sm"
            noShadow={true}
            borderRadius="6px"
            requireNetwork={DAO_NETWORK.FUSE} 
            onClick={() => {
              toggleModal('claim')
            }}> {i18n._(t`Claim Rewards`)} </ActionOrSwitchButton>
          </div>
        </div>
      </td>
      {/* </PortfolioAnalyticSC> */}
      </tr>
  )
}