import React, { memo, useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { CentreBox, ClaimButton, ClaimCarousel, IClaimCard, Image, Title, useModal } from '@gooddollar/good-design'
import { Box, Text, useBreakpointValue, View } from 'native-base'
import { useConnectWallet } from '@web3-onboard/react'
import { isMobile } from 'react-device-detect'
import { useClaim, SupportedV2Networks } from '@gooddollar/web3sdk-v2'
import { QueryParams } from '@usedapp/core'
import { noop } from 'lodash'
import { usePostHog } from 'posthog-js/react'

import { ClaimBalance } from './ClaimBalance'
import useActiveWeb3React from 'hooks/useActiveWeb3React'

import useSendAnalyticsData from 'hooks/useSendAnalyticsData'
import { NewsFeedWidget } from '../../../components/NewsFeed'

import BillyHappy from 'assets/images/claim/billysmile.png'
import BillyGrin from 'assets/images/claim/billygrin.png'
import BillyConfused from 'assets/images/claim/billyconfused.png'

import Maintance from 'assets/images/claim/maintance.png'

const DialogHeader = () => (
    <Box>
        <Title color="main" fontSize="l" lineHeight={36}>
            Claiming Unavailable
        </Title>
    </Box>
)

const DialogBody = ({ message }: { message: string }) => (
    <View>
        <Image resizeMode="contain" source={{ uri: Maintance }} w="auto" h={120} mb={4} />
        <Text fontFamily="subheading" lineHeight="20px">
            {message}
        </Text>
    </View>
)

const useDisabledClaimingModal = (message: string) => {
    const { Modal, showModal } = useModal()

    const Dialog = useCallback(
        () => (
            <React.Fragment>
                <Modal
                    _modalContainer={{ paddingLeft: 18, paddingRight: 18, paddingBottom: 18 }}
                    header={<DialogHeader />}
                    body={<DialogBody message={message} />}
                    onClose={noop}
                    closeText="x"
                />
            </React.Fragment>
        ),
        [Modal]
    )

    return { Dialog, showModal }
}

const Claim = memo(() => {
    const { i18n } = useLingui()
    const [refreshRate, setRefreshRate] = useState<QueryParams['refresh']>(12)
    const {
        claimAmount,
        claimCall: { state, send, resetState },
    } = useClaim(refreshRate)
    const [claimed, setClaimed] = useState<boolean | undefined>(undefined)
    const [, connect] = useConnectWallet()
    const { chainId } = useActiveWeb3React()
    const network = SupportedV2Networks[chainId]
    const sendData = useSendAnalyticsData()
    const postHog = usePostHog()
    const payload = postHog?.getFeatureFlagPayload('claim-feature')
    const { enabled: claimEnabled, disabledMessage = '' } = (payload as any) || {}

    const { Dialog, showModal } = useDisabledClaimingModal(disabledMessage)

    // there are three possible scenarios
    // 1. claim amount is 0, meaning user has claimed that day
    // 2. status === success, meaning user has just claimed. Could happen that claimAmount has not been updated right after tx confirmation
    // 3. If neither is true, there is a claim ready for user or its a new user and FV will be triggered instead
    useEffect(() => {
        const hasClaimed = async () => {
            if (state.status === 'Mining') {
                // don't do anything until transaction is mined
                return
            }

            if (claimAmount?.isZero()) {
                setClaimed(true)
                setRefreshRate(12)
                resetState()
                return
            } else if (state.status === 'Success') {
                setClaimed(true)
                return
            }

            setClaimed(false)
            setRefreshRate('everyBlock')
        }
        if (claimAmount) hasClaimed().catch(noop)
        // eslint-disable-next-line react-hooks-addons/no-unused-deps, react-hooks/exhaustive-deps
    }, [claimAmount, chainId, refreshRate])

    // upon switching chain we want temporarily to poll everyBlock up untill we have the latest data
    useEffect(() => {
        setClaimed(undefined)
        setRefreshRate('everyBlock')
    }, [/* used */ chainId])

    const handleEvents = useCallback(
        (event: string) => {
            switch (event) {
                case 'switch_start':
                    sendData({ event: 'claim', action: 'network_switch_start', network })
                    break
                case 'switch_succes':
                    sendData({ event: 'claim', action: 'network_switch_success', network })
                    break
                case 'action_start':
                    sendData({ event: 'claim', action: 'claim_start', network })
                    break
                case 'finish':
                    // finish event does not handle rejected case
                    // sendData({ event: 'claim', action: 'claim_success', network })
                    break
                default:
                    sendData({ event: 'claim', action: event, network })
                    break
            }
        },
        [sendData, network]
    )

    const handleClaim = useCallback(async () => {
        setRefreshRate('everyBlock')
        if (claimEnabled) {
            const claim = await send()
            if (!claim) {
                return false
            }
            sendData({ event: 'claim', action: 'claim_success', network })
            return true
        }

        showModal()
        return false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [send, network, sendData])

    const handleConnect = useCallback(async () => {
        if (claimEnabled) {
            const state = await connect()

            return !!state.length
        }

        showModal()
        return false
    }, [connect])

    const mainView = useBreakpointValue({
        base: {
            gap: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            width: '100%',
            mb: 2,
        },
        lg: {
            flexDirection: 'row',
            justifyContent: 'justify-evenly',
        },
    })

    const claimView = useBreakpointValue({
        base: {
            display: 'flex',
            alignItems: 'center',
            paddingTop: '2.5rem',
            width: '100%',
        },
        lg: {
            paddingRight: 24,
            paddingLeft: 63,
            alignItems: 'center',
            flexGrow: 1,
        },
    })

    const carrouselStyles = useBreakpointValue({
        base: {
            width: '100%',
            alignSelf: 'flex-start',
            marginLeft: 0,
            flexGrow: 1,
        },
        lg: {
            flex: 1,
            flexDirection: 'column',
            width: '100%',
            flexGrow: 1,
            alignSelf: 'flex-start',
            justifyContent: 'flex-start',
        },
        '2xl': {
            flex: 1,
            flexDirection: 'column',
            width: '100%',
            flexGrow: 1,
            alignSelf: 'flex-end',
            justifyContent: 'flex-start',
        },
    })

    const newsFeedView = useBreakpointValue({
        base: {
            width: '100%',
            marginTop: 16,
        },
        lg: {
            paddingLeft: 24,
            width: 375,
            justifyContent: 'flex-start',
        },
    })

    const balanceContainer = useBreakpointValue({
        base: {
            display: 'flex',
            alignItems: 'center',
            width: '369px',
        },
    })

    const mockedCards: Array<IClaimCard> = [
        {
            id: 'how-does-work',
            title: {
                text: 'How does it work?',
                color: 'primary',
            },
            content: [
                {
                    subTitle: {
                        text: 'Free money, no catch, all thanks to technology.',
                        color: 'goodGrey.500',
                    },
                    description: {
                        text: 'Learn more about how the GoodDollar protocol works here.',
                        color: 'goodGrey.500',
                    },
                    ...(isMobile && { imgSrc: BillyConfused }),
                },
            ],
            externalLink: 'https://www.notion.so/gooddollar/GoodDollar-Protocol-2cc5c26cf09d40469e4570ad1d983914',
            bgColor: 'goodWhite.100',
            hide: claimed,
        },
        {
            id: 'already-claimed',
            title: {
                text: `Use your G$. 🙂`,
                color: 'white',
            },
            content: [
                {
                    description: {
                        text: `After claiming your G$, use it to support your community, buy products and services, support causes you care about, vote in the GoodDAO, and more. 
                      
Learn how here`,
                        color: 'white',
                    },
                    ...(isMobile && { imgSrc: BillyHappy }),
                },
            ],
            externalLink: 'https://www.notion.so/gooddollar/Use-G-8639553aa7214590a70afec91a7d9e73',
            bgColor: 'primary',
        },
        {
            id: 'how-to-collect',
            title: {
                text: 'How to collect G$',
                color: 'primary',
            },
            content: [
                {
                    subTitle: {
                        text: 'First time here?',
                        color: 'goodGrey.500',
                    },
                    description: {
                        text: 'Anyone in the world can collect G$. Create a wallet to get started.',
                        color: 'goodGrey.500',
                    },
                    ...(isMobile && { imgSrc: BillyGrin }),
                },
            ],
            externalLink: 'https://www.notion.so/Get-G-873391f31aee4a18ab5ad7fb7467acb3',
            bgColor: 'goodWhite.100',
            hide: claimed,
        },
    ]

    return (
        <>
            <Box w="100%" mb="8" style={mainView}>
                <Dialog />
                <CentreBox style={claimView}>
                    <div className="flex flex-col items-center text-center lg:w-1/2">
                        <Box style={balanceContainer}>
                            {claimed ? (
                                <ClaimBalance refresh={refreshRate} />
                            ) : (
                                <>
                                    <Title fontFamily="heading" fontSize="2xl" fontWeight="extrabold" pb="2">
                                        {i18n._(t`Collect G$`)}
                                    </Title>

                                    <Text
                                        w="340px"
                                        fontFamily="subheading"
                                        fontWeight="normal"
                                        color="goodGrey.500"
                                        fontSize="sm"
                                    >
                                        {i18n._(
                                            t`GoodDollar creates free money as a public good, G$ tokens, which you can collect daily.`
                                        )}
                                    </Text>
                                </>
                            )}
                            <ClaimButton
                                firstName="Test"
                                method="redirect"
                                claim={handleClaim}
                                claimed={claimed}
                                claiming={state?.status === 'Mining' || state?.status === 'Success'} // we check for both to prevent a pre-mature closing of finalization modal
                                handleConnect={handleConnect}
                                chainId={chainId}
                                onEvent={handleEvents}
                            />
                        </Box>
                    </div>
                    <CentreBox style={carrouselStyles}>
                        <ClaimCarousel cards={mockedCards} claimed={claimed} isMobile={isMobile} />
                    </CentreBox>
                </CentreBox>
                <CentreBox style={newsFeedView}>
                    <NewsFeedWidget />
                </CentreBox>
            </Box>
        </>
    )
})

export default Claim
