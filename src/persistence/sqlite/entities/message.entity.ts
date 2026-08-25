import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'messages' })
export class MessageEntity {
  /**
   * `${fromId}:${packetId}` — Meshtastic's own notion of packet identity. The
   * packet id alone is not unique across the mesh; it is only unique per sender.
   */
  @PrimaryColumn({ type: 'text', name: 'id' })
  id!: string;

  @Column({ type: 'integer', name: 'packet_id' })
  packetId!: number;

  @Index('idx_messages_from_id')
  @Column({ type: 'text', name: 'from_id' })
  fromId!: string;

  @Column({ type: 'integer', name: 'from_num' })
  fromNum!: number;

  @Column({ type: 'text', name: 'to_id' })
  toId!: string;

  @Column({ type: 'integer', name: 'to_num' })
  toNum!: number;

  @Column({ type: 'boolean', name: 'broadcast', default: false })
  broadcast!: boolean;

  @Column({ type: 'integer', name: 'portnum', nullable: true })
  portnum!: number | null;

  @Index('idx_messages_port_name')
  @Column({ type: 'text', name: 'port_name', nullable: true })
  portName!: string | null;

  @Column({ type: 'integer', name: 'channel', nullable: true })
  channel!: number | null;

  @Column({ type: 'boolean', name: 'encrypted', default: false })
  encrypted!: boolean;

  @Column({ type: 'text', name: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'integer', name: 'battery_level', nullable: true })
  batteryLevel!: number | null;

  @Column({ type: 'float', name: 'voltage', nullable: true })
  voltage!: number | null;

  @Column({ type: 'float', name: 'channel_utilization', nullable: true })
  channelUtilization!: number | null;

  @Column({ type: 'float', name: 'air_util_tx', nullable: true })
  airUtilTx!: number | null;

  @Column({ type: 'float', name: 'temperature', nullable: true })
  temperature!: number | null;

  @Column({ type: 'float', name: 'humidity', nullable: true })
  humidity!: number | null;

  @Column({ type: 'float', name: 'pressure', nullable: true })
  pressure!: number | null;

  @Index('idx_messages_heard_at')
  @Column({ type: 'datetime', name: 'heard_at' })
  heardAt!: Date;

  @Column({ type: 'text', name: 'heard_by', nullable: true })
  heardBy!: string | null;

  @Column({ type: 'float', name: 'snr', nullable: true })
  snr!: number | null;

  @Column({ type: 'integer', name: 'rssi', nullable: true })
  rssi!: number | null;

  @Column({ type: 'integer', name: 'hops_away', nullable: true })
  hopsAway!: number | null;

  @Column({ type: 'boolean', name: 'via_mqtt', default: false })
  viaMqtt!: boolean;

  /** Copies of this packet reported so far — a mesh rebroadcasts heavily. */
  @Column({ type: 'integer', name: 'receptions', default: 1 })
  receptions!: number;

  @CreateDateColumn({ type: 'datetime', name: 'first_heard_at' })
  firstHeardAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
