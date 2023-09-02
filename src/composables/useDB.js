/**
 * BotFi (https://botfi.app)
 * @author BotFi <hello@botfi.app>
 */

import { inject } from "vue"

export const useDB = () => {
    
    const botUtils = inject("botUtils")
    const cloudStore = botUtils.cloudStore()

    const getKey = (key) => `${botUtils.getUid()}_${key}`

    const setItem = async (key, value, enableCloud = false) => {
        
        let _k = getKey(key)
        let _v = JSON.stringify({ d: value })

        localStorage.setItem(_k, _v)  
        
        if(enableCloud){
            await cloudStore.setItem(_k, _v)
        }

        return true 
    }

    const getItem = async (key, enableCloud = false) => {

        let _k = getKey(key)
        
        let _v = localStorage.getItem(_k) || null 

        if(_v == null && enableCloud){
            _v = await cloudStore.getItem(_k)
        }

        if(_v == null) return null;

        return JSON.parse(_v).d;
    }

    const removeItem = async (key, enableCloud = false) => {
        let _k = getKey(key)
        localStorage.removeItem(_k)

        if(enableCloud){
            cloudStore.removeItem(_k)
        }
    }


    return { setItem, getItem, removeItem }
}