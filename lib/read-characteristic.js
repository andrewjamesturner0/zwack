import bleno from 'bleno';

class StaticReadCharacteristic extends bleno.Characteristic {
	constructor(uuid, description, value) {
		super({
			uuid: uuid,
			properties: ['read'],
			value: Buffer.isBuffer(value) ? value : Buffer.from(value),
			descriptors: [
				new bleno.Descriptor({
					uuid: '2901',
					value: description
				})
			]
		});
		this.uuid = uuid;
		this.description = description;
		this.value = Buffer.isBuffer(value) ? value : Buffer.from(value);
	}
}

export default StaticReadCharacteristic;
