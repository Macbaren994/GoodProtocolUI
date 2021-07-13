import React, { Suspense, useEffect, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { AppBar, Polling, Popups } from '../components'
import Web3ReactManager from '../components/Web3ReactManager'
import ReactGA from 'react-ga'
import Routes from '../routes'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../state'
import { updateUserDarkMode } from '../state/user/actions'
import { parse } from 'qs'
import isEqual from 'lodash/isEqual'
import SideBar from '../components/SideBar'
import useTheme from '../hooks/useTheme'
import styled from 'styled-components'

export const Beta = styled.div`
    font-style: normal;
    font-weight: bold;
    font-size: 14px;
    line-height: 166%;
    letter-spacing: 0.35px;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.text5};
    text-align: center;
`

const ContentWrapper = styled.div`
    @media ${({ theme }) => theme.media.md} {
        padding-bottom: 85px;
    }
`

function App(): JSX.Element {
    const bodyRef = useRef<any>(null)

    const { location, replace } = useHistory()

    const { search, pathname } = useLocation()

    const dispatch = useDispatch<AppDispatch>()
    const [preservedSource, setPreservedSource] = useState('')

    useEffect(() => {
        const parsed = parse(location.search, { parseArrays: false, ignoreQueryPrefix: true })

        if (!isEqual(parsed['utm_source'], preservedSource)) {
            setPreservedSource(parsed['utm_source'] as string)
        }

        if (preservedSource && !location.search.includes('utm_source')) {
            replace({
                ...location,
                search: location.search
                    ? location.search + '&utm_source=' + preservedSource
                    : location.search + '?utm_source=' + preservedSource
            })
        }
    }, [preservedSource, location, replace])

    // useEffect(() => {
    //     if (pathname === '/trade') {
    //         setWrapperClassList(
    //             'flex flex-col flex-1 items-center justify-start w-screen h-full overflow-y-auto overflow-x-hidden z-0'
    //         )
    //     } else {
    //         setWrapperClassList(
    //             'flex flex-col flex-1 items-center justify-start w-screen h-full overflow-y-auto overflow-x-hidden z-0 pt-4 sm:pt-8 px-4 md:pt-10 pb-20'
    //         )
    //     }
    // }, [pathname])

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTo(0, 0)
        }
    }, [pathname])

    useEffect(() => {
        ReactGA.pageview(`${pathname}${search}`)
    }, [pathname, search])

    useEffect(() => {
        if (!search) return
        if (search.length < 2) return

        const parsed = parse(search, {
            parseArrays: false,
            ignoreQueryPrefix: true
        })

        const theme = parsed.theme

        if (typeof theme !== 'string') return

        if (theme.toLowerCase() === 'light') {
            dispatch(updateUserDarkMode({ userDarkMode: false }))
        } else if (theme.toLowerCase() === 'dark') {
            dispatch(updateUserDarkMode({ userDarkMode: true }))
        }
    }, [dispatch, search])

    const theme = useTheme()

    return (
        <Suspense fallback={null}>
            <div className="flex flex-col h-screen overflow-hidden">
                <AppBar />
                <div className="flex flex-grow overflow-hidden">
                    <SideBar />
                    <ContentWrapper
                        ref={bodyRef}
                        className="flex flex-col items-center justify-between flex-grow h-full overflow-y-auto overflow-x-hidden z-0 pt-4 sm:pt-8 px-4 md:pt-10 pb-8"
                        style={{
                            background: theme.color.mainBg
                        }}
                    >
                        <Popups />
                        {/*<Polling />*/}
                        <Web3ReactManager>
                            <div className="flex flex-col flex-glow w-full items-center justify-start">
                                <Routes />
                            </div>
                        </Web3ReactManager>
                        <Beta className="mt-3 lg:mt-8">This project is in beta. Use at your own risk</Beta>
                    </ContentWrapper>
                </div>
            </div>
        </Suspense>
    )
}

export default App
