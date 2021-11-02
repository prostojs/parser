import { GenericNode, TGenericNodeOptions } from '.'
import { TDefaultCustomDataType, TGenericCustomDataType } from '..'

export class GenericRecursiveNode<T extends TGenericCustomDataType = TDefaultCustomDataType> extends GenericNode<T> {
    constructor(options: TGenericNodeOptions) {
        super(options)
        this.addMergeWith({ parent: this, join: true })
        this.addRecognizes(this)
    }
}
