import React, { memo, useCallback } from 'react'
import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import { CentreBox, Converter, GdOnramperWidget, SlideDownTab, Title } from '@gooddollar/good-design'
import { Box, Text, useBreakpointValue } from 'native-base'
import { g$Price } from '@gooddollar/web3sdk'
import { useGetEnvChainId } from '@gooddollar/web3sdk-v2'

import usePromise from 'hooks/usePromise'
import useSendAnalyticsData from 'hooks/useSendAnalyticsData'
import { Faq } from 'components/Faq'

const BuyGd = memo(() => {
    const sendData = useSendAnalyticsData()

    const { connectedEnv } = useGetEnvChainId(42220)
    const isProd = connectedEnv.includes('production')

    const handleEvents = useCallback(
        (event: string, data?: any, error?: string) => {
            sendData({ event: 'buy', action: event, ...(error && { error: error }) })
        },
        [sendData]
    )

    const [G$Price] = usePromise(
        () =>
            g$Price()
                .then(({ DAI }) => +DAI.toSignificant(6))
                .catch(() => undefined),
        []
    )

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

    const leftContainer = useBreakpointValue({
        lg: {
            paddingRight: 24,
            paddingLeft: 63,
            alignItems: 'stretch',
            borderRightWidth: 1,
            flexGrow: 1,
            justifyContent: 'flex-start',
        },
    })

    const rightContainer = useBreakpointValue({
        lg: {
            paddingLeft: 24,
            paddingTop: 60,
            width: 375,
        },
    })

    const containerCopy = useBreakpointValue({
        base: {
            width: 350,
            fontSize: 'sm',
        },
        lg: {
            width: 600,
        },
    })

    const sideTabs = useBreakpointValue({
        base: {
            alignItems: 'center',
        },
        lg: {
            alignItems: 'flex-start',
        },
    })

    const onrampWrapper = useBreakpointValue({
        base: {
            width: '110%',
        },
        lg: {
            width: '100%',
        },
    })

    return (
        <Box w="100%" mb="8" style={mainView}>
            <CentreBox borderColor="borderGrey" style={leftContainer}>
                <Title fontFamily="heading" fontSize="2xl" fontWeight="extrabold" pb="2" textAlign="center">
                    {i18n._(t`Buy G$`)}
                </Title>

                <Text
                    style={containerCopy}
                    alignSelf="center"
                    color="goodGrey.500"
                    fontFamily="subheading"
                    fontWeight="normal"
                    mb={6}
                >
                    {i18n._(
                        t`Support global financial inclusion and contribute to social impact by purchasing GoodDollars (G$).`
                    )}
                </Text>
                <Text
                    style={containerCopy}
                    alignSelf="center"
                    color="goodGrey.500"
                    fontFamily="subheading"
                    fontWeight="bold"
                    mb={6}
                >
                    {i18n._(
                        t`
                Choose the currency you want to use and buy cUSD. Your cUSD is then automatically converted into G$.`
                    )}
                </Text>
                {/* todo: width on mobile should be more responsive */}
                <Box style={onrampWrapper}>
                    <GdOnramperWidget
                        isTesting={!isProd}
                        onEvents={handleEvents}
                        apiKey={process.env.REACT_APP_ONRAMPER_KEY}
                    />
                </Box>
            </CentreBox>
            <CentreBox w="100%" justifyContent="flex-start" style={rightContainer}>
                <Box w="100%" mb={2} style={sideTabs}>
                    {G$Price && (
                        <SlideDownTab
                            tabTitle="G$ Calculator"
                            viewInteraction={{ hover: { backgroundColor: 'primary:alpha.10', borderRadius: 6 } }}
                            styles={{
                                titleFont: { fontSize: 'l' },
                            }}
                        >
                            <Converter gdPrice={G$Price} />
                        </SlideDownTab>
                    )}
                </Box>
                <Box w="100%" mb={2} style={sideTabs}>
                    <Faq />
                </Box>
            </CentreBox>
        </Box>
    )
})

export default BuyGd
