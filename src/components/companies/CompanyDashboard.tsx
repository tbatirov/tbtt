import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanyStore } from '../../store/companyStore';
import { PeriodSelector } from './PeriodSelector';
import { CompanyHeader } from './CompanyHeader';
import { WorkflowStatus } from '../workflow/WorkflowStatus';
import { StatementGenerator } from '../reports/StatementGenerator';
import { FinancialMetrics } from '../reports/FinancialMetrics';

export const CompanyDashboard = () => {
  const { id } = useParams();
  const company = useCompanyStore(state => state.companies.find(c => c.id === id));
  const [selectedPeriod, setSelectedPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  
  if (!company) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Company not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Period Selection</h2>
          <PeriodSelector 
            companyId={company.id!} 
            onPeriodChange={setSelectedPeriod}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Workflow Status</h2>
          <WorkflowStatus companyId={company.id!} />
        </div>
      </div>

      <FinancialMetrics 
        companyId={company.id!}
        period={selectedPeriod}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <StatementGenerator 
          companyId={company.id!}
          period={selectedPeriod}
        />
      </div>
    </div>
  );
};