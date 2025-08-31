#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsDeathNoteStack } from '../lib/aws-death-note-stack';

const app = new cdk.App();
new AwsDeathNoteStack(app, 'AwsDeathNoteStack', {});