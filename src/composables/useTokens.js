/**
 * BotFi (https://botfi.app)
 * @author BotFi <hello@botfi.app>
 */

import { inject, onBeforeMount, toValue } from "vue"
import { useDB } from "./useDB"
import { useNetworks } from "./useNetworks"

export const useTokens = () => {

    const net = useNetworks()
    const _db = useDB()

    const getTokens = async (limit = null) => {

        let netInfo = await net.getActiveNetworkInfo()

        //console.log("netInfo===>", netInfo)

        let chainId = netInfo.chainId
        
        let db = await _db.getDB()

        let query =  db.tokens.where("chainId").equals(chainId)

        if(Number.isInteger(limit) && limit > 0){
            query = query.limit(limit)
        }

        let tokens = await query.toArray()

        console.log("tokens===>", tokens)
        return tokens;
    }

    const getToken = async (id) => {

    }

    const importToken = async (contract) => {
        
    }

    return {
        getTokens,
        importToken
    }
}